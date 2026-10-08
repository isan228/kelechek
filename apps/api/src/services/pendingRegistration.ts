import { prisma } from "../lib/prisma.js";

/** Регистрация без успешной оплаты освобождает логин и телефон через это время. */
export const PENDING_REGISTRATION_TTL_MS = 30 * 60 * 1000;

/** Удаляет неоплаченную регистрацию вместе с её неуспешными платежами. */
export async function purgePendingUser(userId: string): Promise<boolean> {
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true } });
      if (!user || user.status !== "PENDING_PAYMENT") return false;
      const paid = await tx.payment.count({ where: { userId, status: "SUCCEEDED" } });
      if (paid > 0) return false;
      await tx.payment.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
      return true;
    });
  } catch {
    return false;
  }
}

export async function purgeStalePendingUsers(): Promise<number> {
  const stale = await prisma.user.findMany({
    where: {
      status: "PENDING_PAYMENT",
      createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
    take: 500,
  });
  let removed = 0;
  for (const u of stale) if (await purgePendingUser(u.id)) removed += 1;
  return removed;
}
