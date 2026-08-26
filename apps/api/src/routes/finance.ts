import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { hasRole, requireAuth, requireRole } from "../lib/auth.js";
import {
  computeStreak,
  firstAccrualAt,
  getTraineeBalance,
} from "../services/balance.js";
import { getActiveMembership } from "../services/access.js";
import { DateTime } from "luxon";
import { BISHKEK } from "../lib/prisma.js";
import { startTariffPayment } from "../services/startPayment.js";

function pickI18n<T extends { locale: string }>(rows: T[], locale: string): T | undefined {
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === "ru") ?? rows[0];
}

export async function registerFinanceRoutes(app: FastifyInstance) {
  app.get("/api/tariffs", async (request) => {
    const q = request.query as { locale?: string };
    const locale = request.authUser?.locale ?? (q.locale === "ky" ? "ky" : "ru");
    const tariffs = await prisma.tariff.findMany({
      where: { isActive: true },
      include: { translations: true },
    });
    return {
      tariffs: tariffs.map((t) => {
        const tr = pickI18n(t.translations, locale);
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

    try {
      const result = await startTariffPayment({
        userId: user.id,
        tariffId: body.tariffId,
        lang: user.locale === "ky" ? "ky" : "ru",
        reply,
      });
      if (!result) return;
      return {
        payment: { id: result.paymentId, status: result.status },
        paymentUrl: result.paymentUrl,
      };
    } catch (err) {
      request.log.error({ err }, "create payment failed");
      return reply.code(502).send({ error: "PAYMENT_PROVIDER_ERROR" });
    }
  });

  app.get("/api/payments/:id", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const id = (request.params as { id: string }).id;
    const payment = await prisma.payment.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true, amountKgs: true, paidAt: true, createdAt: true },
    });
    if (!payment) return reply.code(404).send({ error: "NOT_FOUND" });
    return { payment };
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
