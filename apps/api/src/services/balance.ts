import { DateTime } from "luxon";
import { prisma } from "../lib/prisma.js";
import { BISHKEK } from "../lib/prisma.js";

export async function getTraineeBalance(userId: string) {
  const agg = await prisma.traineeLedgerEntry.aggregate({
    where: { userId },
    _sum: { signedAmount: true },
  });
  const holds = await prisma.traineeLedgerEntry.aggregate({
    where: { userId, type: "HOLD" },
    _sum: { signedAmount: true },
  });
  const accrued = agg._sum.signedAmount ?? 0;
  const holdSum = Math.abs(holds._sum.signedAmount ?? 0);
  return {
    accrued,
    hold: holdSum,
    available: accrued,
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
