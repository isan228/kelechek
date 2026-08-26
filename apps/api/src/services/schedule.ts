import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function ensureCoachClass(coachId: string) {
  const existing = await prisma.class.findFirst({
    where: { coachId, isActive: true },
    orderBy: { id: "asc" },
  });
  if (existing) return existing;

  return prisma.class.create({
    data: {
      coachId,
      isActive: true,
      translations: {
        create: [
          { locale: "ru", name: "Тренировки" },
          { locale: "ky", name: "Машыгуулар" },
        ],
      },
    },
  });
}

/** Все активные ученики тренера → участники его класса. */
export async function syncClassMembersFromRelations(coachId: string, classId: string) {
  const relations = await prisma.coachingRelation.findMany({
    where: { coachId, status: "ACTIVE" },
    select: { traineeId: true },
  });
  for (const r of relations) {
    await prisma.classMember.upsert({
      where: { classId_traineeId: { classId, traineeId: r.traineeId } },
      create: { classId, traineeId: r.traineeId },
      update: {},
    });
  }
}

export async function addTraineeToCoachClass(coachId: string, traineeId: string) {
  const cls = await ensureCoachClass(coachId);
  await prisma.classMember.upsert({
    where: { classId_traineeId: { classId: cls.id, traineeId } },
    create: { classId: cls.id, traineeId },
    update: {},
  });
  return cls;
}

export async function createNotification(
  userId: string,
  type: string,
  payload: Prisma.InputJsonValue,
) {
  return prisma.notification.create({
    data: { userId, type, payload },
  });
}

export async function notifyCoachTrainees(
  coachId: string,
  type: string,
  payload: Prisma.InputJsonValue,
) {
  const relations = await prisma.coachingRelation.findMany({
    where: { coachId, status: "ACTIVE" },
    select: { traineeId: true },
  });
  if (!relations.length) return 0;
  await prisma.notification.createMany({
    data: relations.map((r) => ({
      userId: r.traineeId,
      type,
      payload,
    })),
  });
  return relations.length;
}
