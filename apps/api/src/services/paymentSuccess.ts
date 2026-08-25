import { randomUUID } from "node:crypto";
import { distributePayment, ratesFor } from "@kelech/shared";
import type { Prisma } from "@prisma/client";
import { prisma, MEMBERSHIP_DAYS } from "../lib/prisma.js";
import { addDaysExclusive, startOfTodayBishkek } from "../lib/time.js";

async function nextPeriodStart(tx: Prisma.TransactionClient, userId: string): Promise<Date> {
  const now = new Date();
  const current = await tx.membershipPeriod.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      endsAtExclusive: { gt: now },
    },
    orderBy: { endsAtExclusive: "desc" },
  });
  if (current) return current.endsAtExclusive;
  return startOfTodayBishkek();
}

export async function applySuccessfulPayment(paymentId: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("PAYMENT_NOT_FOUND");
  if (payment.status === "SUCCEEDED") return;

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `SELECT pg_advisory_xact_lock(hashtext($1))`,
      payment.userId,
    );

    const fresh = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!fresh || fresh.status === "SUCCEEDED") return;

    const relation = await tx.coachingRelation.findFirst({
      where: { traineeId: fresh.userId, status: "ACTIVE" },
    });
    const hasCoach = Boolean(relation);
    const shares = distributePayment(fresh.amountKgs, hasCoach);
    const rates = ratesFor(hasCoach);
    const groupId = randomUUID();
    const startsAt = await nextPeriodStart(tx, fresh.userId);
    const endsAtExclusive = addDaysExclusive(startsAt, MEMBERSHIP_DAYS);

    await tx.payment.update({
      where: { id: fresh.id },
      data: {
        status: "SUCCEEDED",
        paidAt: new Date(),
        traineeRateBps: rates.traineeBps,
        coachRateBps: rates.coachBps,
        coachId: relation?.coachId ?? null,
        coachingRelationId: relation?.id ?? null,
        distributionGroupId: groupId,
        traineeShareKgs: shares.trainee,
        coachShareKgs: shares.coach,
        operatorShareKgs: shares.operator,
        providerPaymentId: fresh.providerPaymentId ?? fresh.id,
      },
    });

    await tx.membershipPeriod.create({
      data: {
        userId: fresh.userId,
        paymentId: fresh.id,
        startsAt,
        endsAtExclusive,
        status: "ACTIVE",
      },
    });

    await tx.traineeLedgerEntry.create({
      data: {
        userId: fresh.userId,
        type: "CREDIT_ACCRUAL",
        amount: shares.trainee,
        signedAmount: shares.trainee,
        appliedTraineeRateBps: rates.traineeBps,
        paymentId: fresh.id,
        distributionGroupId: groupId,
        coachId: relation?.coachId ?? null,
        coachingRelationId: relation?.id ?? null,
        actorId: null,
      },
    });

    if (relation && shares.coach > 0) {
      await tx.coachLedgerEntry.create({
        data: {
          coachId: relation.coachId,
          type: "CREDIT_ACCRUAL",
          amount: shares.coach,
          signedAmount: shares.coach,
          appliedCoachRateBps: rates.coachBps,
          paymentId: fresh.id,
          traineeUserId: fresh.userId,
          distributionGroupId: groupId,
          coachingRelationId: relation.id,
        },
      });
    }

    await tx.operatorLedgerEntry.create({
      data: {
        type: "CREDIT_ACCRUAL",
        amount: shares.operator,
        signedAmount: shares.operator,
        paymentId: fresh.id,
        distributionGroupId: groupId,
      },
    });

    await tx.processedWebhook.create({
      data: {
        provider: fresh.provider,
        providerEventId: `success:${fresh.id}`,
        paymentId: fresh.id,
      },
    });
  });
}
