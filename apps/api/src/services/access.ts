import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function isContentAccessible(
  tx: Prisma.TransactionClient | typeof prisma,
  userId: string,
  roles: string[],
): Promise<boolean> {
  if (roles.includes("COACH") || roles.includes("ADMIN") || roles.includes("CONTENT_EDITOR")) {
    return true;
  }
  const now = new Date();
  const period = await tx.membershipPeriod.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      startsAt: { lte: now },
      endsAtExclusive: { gt: now },
    },
  });
  return Boolean(period);
}

export async function getActiveMembership(userId: string) {
  const now = new Date();
  return prisma.membershipPeriod.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      startsAt: { lte: now },
      endsAtExclusive: { gt: now },
    },
    orderBy: { endsAtExclusive: "desc" },
  });
}
