import type { FastifyInstance } from "fastify";
import type { Prisma, WithdrawalApplication, WithdrawalStatus } from "@prisma/client";
import { DateTime } from "luxon";
import { BISHKEK, prisma } from "../lib/prisma.js";
import { requireRole } from "../lib/auth.js";
import {
  LEDGER_HOLD,
  LEDGER_HOLD_RELEASE,
  LEDGER_PAYOUT,
  computeStreak,
  firstAccrualAt,
  getTraineeBalance,
} from "../services/balance.js";

const OPEN_STATUSES: WithdrawalStatus[] = ["SUBMITTED", "IN_REVIEW", "NEED_INFO", "APPROVED", "PAYOUT_IN_PROGRESS"];
const STAFF_ROLES = ["ADMIN", "ACCOUNTANT"] as const;
const PHONE_RE = /^\+996\d{9}$/;

type Requisites =
  | { kind: "BANK_ACCOUNT"; bankName: string; accountNumber: string; recipientName: string }
  | { kind: "PHONE"; phone: string; provider: string; recipientName: string };

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function parseRequisites(method: unknown, raw: unknown): Requisites | { error: string } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const recipientName = clean(r.recipientName, 120);
  if (method === "BANK_ACCOUNT") {
    const bankName = clean(r.bankName, 80);
    const accountNumber = clean(r.accountNumber, 40).replace(/[\s-]/g, "");
    if (!bankName) return { error: "BANK_REQUIRED" };
    if (!/^[A-Za-z0-9]{8,34}$/.test(accountNumber)) return { error: "INVALID_ACCOUNT" };
    if (!recipientName) return { error: "RECIPIENT_REQUIRED" };
    return { kind: "BANK_ACCOUNT", bankName, accountNumber, recipientName };
  }
  if (method === "PHONE") {
    const phone = clean(r.phone, 20).replace(/[\s()-]/g, "");
    const provider = clean(r.provider, 40);
    if (!PHONE_RE.test(phone)) return { error: "INVALID_PHONE" };
    if (!recipientName) return { error: "RECIPIENT_REQUIRED" };
    return { kind: "PHONE", phone, provider, recipientName };
  }
  return { error: "INVALID_METHOD" };
}

function personName(u: { firstName: string | null; lastName: string | null; login: string | null; phone: string }) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.login || u.phone;
}

async function activePolicyVersionId(tx: Prisma.TransactionClient): Promise<string> {
  const active = await tx.withdrawalPolicyVersion.findFirst({ where: { isActive: true }, orderBy: { version: "desc" } });
  if (active) return active.id;
  const last = await tx.withdrawalPolicyVersion.findFirst({ orderBy: { version: "desc" } });
  const created = await tx.withdrawalPolicyVersion.create({
    data: { version: (last?.version ?? 0) + 1, isActive: true },
  });
  return created.id;
}

function serialize(w: WithdrawalApplication) {
  return {
    id: w.id,
    status: w.status,
    method: w.method,
    amountKgs: w.amountKgs,
    requisites: w.requisitesJson as Requisites,
    conditions: w.conditionResults,
    createdAt: w.createdAt,
    processedAt: w.processedAt,
    payoutReference: w.payoutReference,
    adminComment: w.adminComment,
  };
}

export async function registerWithdrawalRoutes(app: FastifyInstance) {
  app.get("/api/me/withdrawals", async (request, reply) => {
    const user = requireRole(request, reply, ["TRAINEE"]);
    if (!user) return;
    const [balance, items] = await Promise.all([
      getTraineeBalance(user.id),
      prisma.withdrawalApplication.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    const open = items.find((w) => OPEN_STATUSES.includes(w.status)) ?? null;
    return {
      balance,
      open: open ? serialize(open) : null,
      items: items.map(serialize),
    };
  });

  app.post("/api/me/withdrawals", async (request, reply) => {
    const user = requireRole(request, reply, ["TRAINEE"]);
    if (!user) return;
    const body = (request.body ?? {}) as { amountKgs?: unknown; method?: unknown; requisites?: unknown };
    const amountKgs = Number(body.amountKgs);
    if (!Number.isInteger(amountKgs) || amountKgs < 1) return reply.code(400).send({ error: "INVALID_AMOUNT" });
    const requisites = parseRequisites(body.method, body.requisites);
    if ("error" in requisites) return reply.code(400).send({ error: requisites.error });

    const [streak, firstAt] = await Promise.all([computeStreak(user.id), firstAccrualAt(user.id)]);
    const monthsHeld = firstAt
      ? Math.floor(DateTime.now().setZone(BISHKEK).diff(DateTime.fromJSDate(firstAt).setZone(BISHKEK), "months").months)
      : 0;

    try {
      const created = await prisma.$transaction(
        async (tx) => {
          const open = await tx.withdrawalApplication.findFirst({
            where: { userId: user.id, status: { in: OPEN_STATUSES } },
          });
          if (open) throw new Error("WITHDRAWAL_ALREADY_OPEN");

          const sum = await tx.traineeLedgerEntry.aggregate({
            where: { userId: user.id },
            _sum: { signedAmount: true },
          });
          const available = sum._sum.signedAmount ?? 0;
          if (amountKgs > available) throw new Error("INSUFFICIENT_BALANCE");

          const application = await tx.withdrawalApplication.create({
            data: {
              userId: user.id,
              status: "SUBMITTED",
              method: requisites.kind,
              amountKgs,
              policyVersionId: await activePolicyVersionId(tx),
              conditionResults: { streakMonths: streak, monthsHeld, availableAtSubmit: available },
              requisitesJson: requisites,
            },
          });
          const hold = await tx.traineeLedgerEntry.create({
            data: {
              userId: user.id,
              type: LEDGER_HOLD,
              amount: amountKgs,
              signedAmount: -amountKgs,
              withdrawalId: application.id,
              actorId: user.id,
            },
          });
          const withHold = await tx.withdrawalApplication.update({
            where: { id: application.id },
            data: { holdEntryId: hold.id },
          });

          const staff = await tx.user.findMany({
            where: { deletedAt: null, status: "ACTIVE", roles: { hasSome: [...STAFF_ROLES] } },
            select: { id: true },
          });
          const me = await tx.user.findUniqueOrThrow({
            where: { id: user.id },
            select: { firstName: true, lastName: true, login: true, phone: true },
          });
          if (staff.length > 0) {
            await tx.notification.createMany({
              data: staff.map((s) => ({
                userId: s.id,
                type: "WITHDRAWAL_REQUESTED",
                payload: {
                  withdrawalId: application.id,
                  userName: personName(me),
                  phone: me.phone,
                  amountKgs,
                  method: requisites.kind,
                },
              })),
            });
          }
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "WITHDRAWAL_SUBMITTED",
              entityType: "WithdrawalApplication",
              entityId: application.id,
              afterJson: { amountKgs, method: requisites.kind },
              ip: request.ip,
            },
          });
          return withHold;
        },
      );
      return { withdrawal: serialize(created) };
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "WITHDRAWAL_ALREADY_OPEN" || code === "INSUFFICIENT_BALANCE") {
        return reply.code(409).send({ error: code });
      }
      if ((err as { code?: string }).code === "P2002") {
        return reply.code(409).send({ error: "WITHDRAWAL_ALREADY_OPEN" });
      }
      throw err;
    }
  });

  app.post("/api/me/withdrawals/:id/cancel", async (request, reply) => {
    const user = requireRole(request, reply, ["TRAINEE"]);
    if (!user) return;
    const { id } = request.params as { id: string };
    const done = await releaseHold(id, "CANCELED", user.id, null, { userId: user.id, onlyFrom: ["SUBMITTED"] });
    if (!done) return reply.code(409).send({ error: "CANNOT_CANCEL" });
    return { withdrawal: serialize(done) };
  });

  app.get("/api/admin/withdrawals", async (request, reply) => {
    const staff = requireRole(request, reply, [...STAFF_ROLES]);
    if (!staff) return;

    const since = DateTime.now().setZone(BISHKEK).minus({ months: 12 }).startOf("month").toJSDate();
    const [items, incoming, outgoing, pending, monthPayments, monthPayouts, recentPayments] = await Promise.all([
      prisma.withdrawalApplication.findMany({
        orderBy: { createdAt: "desc" },
        take: 300,
        include: { user: { select: { id: true, firstName: true, lastName: true, login: true, phone: true } } },
      }),
      prisma.payment.aggregate({ where: { status: "SUCCEEDED" }, _sum: { amountKgs: true }, _count: { _all: true } }),
      prisma.withdrawalApplication.aggregate({ where: { status: "PAID" }, _sum: { amountKgs: true }, _count: { _all: true } }),
      prisma.withdrawalApplication.aggregate({
        where: { status: { in: OPEN_STATUSES } },
        _sum: { amountKgs: true },
        _count: { _all: true },
      }),
      prisma.payment.findMany({
        where: { status: "SUCCEEDED", OR: [{ paidAt: { gte: since } }, { paidAt: null, createdAt: { gte: since } }] },
        select: { amountKgs: true, paidAt: true, createdAt: true },
      }),
      prisma.withdrawalApplication.findMany({
        where: { status: "PAID", processedAt: { gte: since } },
        select: { amountKgs: true, processedAt: true },
      }),
      prisma.payment.findMany({
        where: { status: "SUCCEEDED" },
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        take: 200,
        include: { user: { select: { firstName: true, lastName: true, login: true, phone: true } } },
      }),
    ]);

    const months = new Map<string, { month: string; inKgs: number; outKgs: number }>();
    const bump = (at: Date, key: "inKgs" | "outKgs", amount: number) => {
      const month = DateTime.fromJSDate(at).setZone(BISHKEK).toFormat("yyyy-MM");
      const row = months.get(month) ?? { month, inKgs: 0, outKgs: 0 };
      row[key] += amount;
      months.set(month, row);
    };
    for (const p of monthPayments) bump(p.paidAt ?? p.createdAt, "inKgs", p.amountKgs);
    for (const w of monthPayouts) if (w.processedAt) bump(w.processedAt, "outKgs", w.amountKgs);

    const flow = [
      ...recentPayments.map((p) => ({
        id: `p-${p.id}`,
        direction: "in" as const,
        at: p.paidAt ?? p.createdAt,
        amountKgs: p.amountKgs,
        person: personName(p.user),
        phone: p.user.phone,
      })),
      ...items
        .filter((w) => w.status === "PAID" && w.processedAt)
        .map((w) => ({
          id: `w-${w.id}`,
          direction: "out" as const,
          at: w.processedAt as Date,
          amountKgs: w.amountKgs,
          person: personName(w.user),
          phone: w.user.phone,
        })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 300);

    const processorIds = [...new Set(items.map((w) => w.processedById).filter((v): v is string => Boolean(v)))];
    const processors = processorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: processorIds } },
          select: { id: true, firstName: true, lastName: true, login: true, phone: true },
        })
      : [];
    const processorById = new Map(processors.map((p) => [p.id, personName(p)]));

    return {
      summary: {
        incomingKgs: incoming._sum.amountKgs ?? 0,
        incomingCount: incoming._count._all,
        outgoingKgs: outgoing._sum.amountKgs ?? 0,
        outgoingCount: outgoing._count._all,
        pendingKgs: pending._sum.amountKgs ?? 0,
        pendingCount: pending._count._all,
      },
      monthly: [...months.values()].sort((a, b) => b.month.localeCompare(a.month)),
      flow,
      items: items.map((w) => ({
        ...serialize(w),
        user: w.user,
        processedBy: w.processedById ? processorById.get(w.processedById) ?? null : null,
      })),
    };
  });

  app.post("/api/admin/withdrawals/:id/paid", async (request, reply) => {
    const staff = requireRole(request, reply, [...STAFF_ROLES]);
    if (!staff) return;
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { payoutReference?: unknown; comment?: unknown };
    const payoutReference = clean(body.payoutReference, 120) || null;
    const adminComment = clean(body.comment, 500) || null;

    const done = await prisma.$transaction(async (tx) => {
      const w = await tx.withdrawalApplication.findUnique({ where: { id } });
      if (!w || !OPEN_STATUSES.includes(w.status)) return null;
      const updated = await tx.withdrawalApplication.updateMany({
        where: { id, status: w.status },
        data: {
          status: "PAID",
          processedAt: new Date(),
          processedById: staff.id,
          payoutReference,
          adminComment,
        },
      });
      if (updated.count !== 1) return null;
      await tx.traineeLedgerEntry.createMany({
        data: [
          {
            userId: w.userId,
            type: LEDGER_HOLD_RELEASE,
            amount: w.amountKgs,
            signedAmount: w.amountKgs,
            withdrawalId: w.id,
            linkedEntryId: w.holdEntryId,
            actorId: staff.id,
          },
          {
            userId: w.userId,
            type: LEDGER_PAYOUT,
            amount: w.amountKgs,
            signedAmount: -w.amountKgs,
            withdrawalId: w.id,
            actorId: staff.id,
          },
        ],
      });
      await tx.notification.create({
        data: {
          userId: w.userId,
          type: "WITHDRAWAL_PAID",
          payload: { withdrawalId: w.id, amountKgs: w.amountKgs },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: staff.id,
          action: "WITHDRAWAL_PAID",
          entityType: "WithdrawalApplication",
          entityId: w.id,
          beforeJson: { status: w.status },
          afterJson: { status: "PAID", payoutReference, adminComment },
          ip: request.ip,
        },
      });
      return tx.withdrawalApplication.findUniqueOrThrow({ where: { id } });
    });
    if (!done) return reply.code(409).send({ error: "NOT_OPEN" });
    return { withdrawal: serialize(done) };
  });

  app.post("/api/admin/withdrawals/:id/reject", async (request, reply) => {
    const staff = requireRole(request, reply, [...STAFF_ROLES]);
    if (!staff) return;
    const { id } = request.params as { id: string };
    const reason = clean((request.body as { reason?: unknown } | null)?.reason, 500);
    if (!reason) return reply.code(400).send({ error: "REASON_REQUIRED" });
    const done = await releaseHold(id, "REJECTED", staff.id, reason, { ip: request.ip });
    if (!done) return reply.code(409).send({ error: "NOT_OPEN" });
    return { withdrawal: serialize(done) };
  });
}

/** Закрывает открытую заявку без выплаты и возвращает замороженную сумму на баланс. */
async function releaseHold(
  id: string,
  status: "REJECTED" | "CANCELED",
  actorId: string,
  comment: string | null,
  opts: { userId?: string; onlyFrom?: WithdrawalStatus[]; ip?: string },
) {
  return prisma.$transaction(async (tx) => {
    const w = await tx.withdrawalApplication.findUnique({ where: { id } });
    const allowed = opts.onlyFrom ?? OPEN_STATUSES;
    if (!w || (opts.userId && w.userId !== opts.userId) || !allowed.includes(w.status)) return null;
    const updated = await tx.withdrawalApplication.updateMany({
      where: { id, status: w.status },
      data: { status, processedAt: new Date(), processedById: actorId, adminComment: comment },
    });
    if (updated.count !== 1) return null;
    await tx.traineeLedgerEntry.create({
      data: {
        userId: w.userId,
        type: LEDGER_HOLD_RELEASE,
        amount: w.amountKgs,
        signedAmount: w.amountKgs,
        withdrawalId: w.id,
        linkedEntryId: w.holdEntryId,
        actorId,
      },
    });
    if (status === "REJECTED") {
      await tx.notification.create({
        data: {
          userId: w.userId,
          type: "WITHDRAWAL_REJECTED",
          payload: { withdrawalId: w.id, amountKgs: w.amountKgs, reason: comment },
        },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId,
        action: status === "REJECTED" ? "WITHDRAWAL_REJECTED" : "WITHDRAWAL_CANCELED",
        entityType: "WithdrawalApplication",
        entityId: w.id,
        beforeJson: { status: w.status },
        afterJson: { status, comment },
        ip: opts.ip ?? null,
      },
    });
    return tx.withdrawalApplication.findUniqueOrThrow({ where: { id } });
  });
}
