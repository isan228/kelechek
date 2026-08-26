import { DateTime } from "luxon";
import { prisma, INVITE_TTL_DAYS } from "../lib/prisma.js";
import { BISHKEK } from "../lib/prisma.js";

export async function sendInvitation(coachId: string, traineePhone: string) {
  const trainee = await prisma.user.findUnique({ where: { phone: traineePhone } });
  if (!trainee) {
    throw Object.assign(new Error("TRAINEE_NOT_FOUND"), { statusCode: 404 });
  }
  if (trainee.id === coachId) {
    throw Object.assign(new Error("CANNOT_INVITE_SELF"), { statusCode: 400 });
  }
  if (!trainee.roles.includes("TRAINEE")) {
    throw Object.assign(new Error("NOT_A_TRAINEE"), { statusCode: 400 });
  }

  const existingSent = await prisma.coachingInvitation.findFirst({
    where: { coachId, traineeId: trainee.id, status: "SENT" },
  });
  if (existingSent) {
    throw Object.assign(new Error("INVITE_ALREADY_SENT"), { statusCode: 409 });
  }

  const active = await prisma.coachingRelation.findFirst({
    where: { traineeId: trainee.id, status: "ACTIVE" },
  });

  const invite = await prisma.coachingInvitation.create({
    data: {
      coachId,
      traineeId: trainee.id,
      status: "SENT",
      expiresAt: DateTime.now().setZone(BISHKEK).plus({ days: INVITE_TTL_DAYS }).toJSDate(),
    },
  });

  return {
    invite,
    traineeHasCoach: Boolean(active),
  };
}

export async function respondInvitation(
  traineeId: string,
  invitationId: string,
  accept: boolean,
  confirmReplace: boolean,
) {
  const invite = await prisma.coachingInvitation.findFirst({
    where: { id: invitationId, traineeId },
  });
  if (!invite) {
    throw Object.assign(new Error("INVITE_NOT_FOUND"), { statusCode: 404 });
  }
  if (invite.status !== "SENT") {
    throw Object.assign(new Error("INVITE_NOT_PENDING"), { statusCode: 409 });
  }
  if (invite.expiresAt < new Date()) {
    await prisma.coachingInvitation.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    throw Object.assign(new Error("INVITE_EXPIRED"), { statusCode: 409 });
  }

  if (!accept) {
    return prisma.coachingInvitation.update({
      where: { id: invite.id },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${traineeId}))`;

    const current = await tx.coachingRelation.findFirst({
      where: { traineeId, status: "ACTIVE" },
    });
    if (current && !confirmReplace) {
      throw Object.assign(new Error("CONFIRM_REPLACE_REQUIRED"), { statusCode: 409 });
    }

    if (current) {
      await tx.coachingRelation.update({
        where: { id: current.id },
        data: { status: "ENDED", endedAt: new Date(), endReason: "REPLACED" },
      });
      await tx.coachCounter.updateMany({
        where: { coachId: current.coachId, activeRelationCount: { gt: 0 } },
        data: { activeRelationCount: { decrement: 1 } },
      });
    }

    await tx.coachingRelation.create({
      data: {
        coachId: invite.coachId,
        traineeId,
        status: "ACTIVE",
        startedAt: new Date(),
        invitationId: invite.id,
      },
    });
    await tx.coachCounter.upsert({
      where: { coachId: invite.coachId },
      create: { coachId: invite.coachId, activeRelationCount: 1 },
      update: { activeRelationCount: { increment: 1 } },
    });
    return tx.coachingInvitation.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED", respondedAt: new Date() },
    });
  });
}

export async function endRelation(userId: string, asAdmin = false, traineeId?: string) {
  const relation = await prisma.coachingRelation.findFirst({
    where: {
      status: "ACTIVE",
      ...(traineeId
        ? { coachId: userId, traineeId }
        : { OR: [{ traineeId: userId }, { coachId: userId }] }),
    },
  });
  if (!relation) {
    throw Object.assign(new Error("NO_ACTIVE_RELATION"), { statusCode: 404 });
  }
  if (!asAdmin && relation.traineeId !== userId && relation.coachId !== userId) {
    throw Object.assign(new Error("FORBIDDEN"), { statusCode: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.coachingRelation.update({
      where: { id: relation.id },
      data: {
        status: "ENDED",
        endedAt: new Date(),
        endReason: asAdmin ? "ADMIN" : relation.traineeId === userId ? "TRAINEE" : "COACH",
      },
    });
    await tx.coachCounter.updateMany({
      where: { coachId: relation.coachId, activeRelationCount: { gt: 0 } },
      data: { activeRelationCount: { decrement: 1 } },
    });
  });
}
