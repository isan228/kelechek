import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { hasRole, requireAuth, requireRole } from "../lib/auth.js";
import { applySuccessfulPayment } from "../services/paymentSuccess.js";
import {
  computeStreak,
  firstAccrualAt,
  getTraineeBalance,
} from "../services/balance.js";
import { getActiveMembership } from "../services/access.js";
import { DateTime } from "luxon";
import { BISHKEK } from "../lib/prisma.js";

function pickI18n<T extends { locale: string }>(rows: T[], locale: string): T | undefined {
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === "ru") ?? rows[0];
}

export async function registerFinanceRoutes(app: FastifyInstance) {
  app.get("/api/tariffs", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const tariffs = await prisma.tariff.findMany({
      where: { isActive: true },
      include: { translations: true },
    });
    return {
      tariffs: tariffs.map((t) => {
        const tr = pickI18n(t.translations, user.locale);
        return {
          id: t.id,
          priceKgs: t.priceKgs,
          periodDays: t.periodDays,
          name: tr?.name ?? "",
          description: tr?.description ?? "",
        };
      }),
    };
  });

  app.post("/api/payments", async (request, reply) => {
    const user = requireRole(request, reply, ["TRAINEE"]);
    if (!user) return;
    const body = request.body as { tariffId?: string };
    if (!body.tariffId) return reply.code(400).send({ error: "TARIFF_REQUIRED" });

    const tariff = await prisma.tariff.findFirst({
      where: { id: body.tariffId, isActive: true },
    });
    if (!tariff) return reply.code(404).send({ error: "TARIFF_NOT_FOUND" });

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        tariffId: tariff.id,
        amountKgs: tariff.priceKgs,
        status: "PENDING",
        provider: process.env.MOCK_PAYMENTS === "true" ? "mock" : "pending-bank",
        idempotencyKey: randomUUID(),
      },
    });

    if (process.env.MOCK_PAYMENTS === "true") {
      await applySuccessfulPayment(payment.id);
      const updated = await prisma.payment.findUnique({ where: { id: payment.id } });
      return { payment: updated };
    }

    return { payment, redirectUrl: null };
  });

  app.get("/api/me/balance", async (request, reply) => {
    const user = requireRole(request, reply, ["TRAINEE", "ADMIN"]);
    if (!user) return;
    if (hasRole(user, "COACH") && !hasRole(user, "ADMIN") && !hasRole(user, "TRAINEE")) {
      return reply.code(403).send({ error: "FORBIDDEN" });
    }
    const targetId = user.id;
    const [balance, streak, firstAt, membership] = await Promise.all([
      getTraineeBalance(targetId),
      computeStreak(targetId),
      firstAccrualAt(targetId),
      getActiveMembership(targetId),
    ]);

    const holdingMonths = 12;
    let monthsHeld = 0;
    if (firstAt) {
      monthsHeld = Math.floor(
        DateTime.now().setZone(BISHKEK).diff(DateTime.fromJSDate(firstAt).setZone(BISHKEK), "months")
          .months,
      );
    }
    const minAmount = 1000;

    return {
      balance,
      streak,
      membership: membership
        ? {
            startsAt: membership.startsAt,
            endsAtExclusive: membership.endsAtExclusive,
          }
        : null,
      withdrawalProgress: {
        holdingMonths,
        monthsHeld,
        holdingPassed: monthsHeld >= holdingMonths,
        minAmountKgs: minAmount,
        minAmountPassed: balance.available >= minAmount,
      },
    };
  });

  app.get("/api/me/ledger", async (request, reply) => {
    const user = requireRole(request, reply, ["TRAINEE", "ADMIN"]);
    if (!user) return;
    const entries = await prisma.traineeLedgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      entries: entries.map((e) => ({
        id: e.id,
        type: e.type,
        amount: e.amount,
        signedAmount: e.signedAmount,
        createdAt: e.createdAt,
        appliedTraineeRateBps: e.appliedTraineeRateBps,
      })),
    };
  });
}
