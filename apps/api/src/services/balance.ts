import { DateTime } from "luxon";
import { prisma } from "../lib/prisma.js";
import { BISHKEK } from "../lib/prisma.js";

export const LEDGER_HOLD = "HOLD";
export const LEDGER_HOLD_RELEASE = "HOLD_RELEASE";
export const LEDGER_PAYOUT = "PAYOUT";

/**
 * available — можно вывести сейчас; hold — заморожено открытой заявкой;
 * accrued = available + hold (накоплено и ещё не выплачено); withdrawn — уже выплачено.
 */
export async function getTraineeBalance(userId: string) {
  const [all, holds, payouts] = await Promise.all([
    prisma.traineeLedgerEntry.aggregate({ where: { userId }, _sum: { signedAmount: true } }),
    prisma.traineeLedgerEntry.aggregate({
      where: { userId, type: { in: [LEDGER_HOLD, LEDGER_HOLD_RELEASE] } },
      _sum: { signedAmount: true },
    }),
    prisma.traineeLedgerEntry.aggregate({
      where: { userId, type: LEDGER_PAYOUT },
      _sum: { signedAmount: true },
    }),
  ]);
  const available = all._sum.signedAmount ?? 0;
  const hold = Math.max(0, -(holds._sum.signedAmount ?? 0));
  return {
    accrued: available + hold,
    hold,
    available,
    withdrawn: Math.max(0, -(payouts._sum.signedAmount ?? 0)),
  };
}

export async function computeStreak(userId: string): Promise<number> {
  const periods = await prisma.membershipPeriod.findMany({
    where: { userId, status: { in: ["ACTIVE", "EXPIRED"] } },
    select: { startsAt: true, endsAtExclusive: true },
  });
  if (periods.length === 0) return 0;

  const covered = new Set<string>();
  for (const p of periods) {
    let cursor = DateTime.fromJSDate(p.startsAt).setZone(BISHKEK).startOf("month");
    const end = DateTime.fromJSDate(p.endsAtExclusive).setZone(BISHKEK);
    while (cursor < end) {
      covered.add(cursor.toFormat("yyyy-MM"));
      cursor = cursor.plus({ months: 1 });
    }
  }

  let streak = 0;
  let month = DateTime.now().setZone(BISHKEK).startOf("month");
  if (!covered.has(month.toFormat("yyyy-MM"))) {
    month = month.minus({ months: 1 });
  }
  while (covered.has(month.toFormat("yyyy-MM"))) {
    streak += 1;
    month = month.minus({ months: 1 });
  }
  return streak;
}

export async function firstAccrualAt(userId: string): Promise<Date | null> {
  const first = await prisma.traineeLedgerEntry.findFirst({
    where: { userId, type: "CREDIT_ACCRUAL" },
    orderBy: { createdAt: "asc" },
  });
  return first?.createdAt ?? null;
}
