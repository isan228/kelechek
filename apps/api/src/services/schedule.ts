import type { Prisma } from "@prisma/client";
import { DateTime } from "luxon";
import { prisma, BISHKEK } from "../lib/prisma.js";

function parseHm(hm: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm).trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/** Создаёт ближайшие ClassSession из постоянного расписания (Бишкек). */
export async function ensureUpcomingFromWeeklySlots(classId: string, daysAhead = 21) {
  const slots = await prisma.weeklySlot.findMany({
    where: { classId, isActive: true },
  });
  if (!slots.length) return 0;

  const zoneNow = DateTime.now().setZone(BISHKEK);
  const startDay = zoneNow.startOf("day");
  let created = 0;

  for (let i = 0; i < daysAhead; i++) {
    const day = startDay.plus({ days: i });
    for (const slot of slots) {
      if (slot.weekday !== day.weekday) continue;
      const start = parseHm(slot.startHm);
      const end = parseHm(slot.endHm);
      if (!start || !end) continue;
      const startsAt = day.set({
        hour: start.hour,
        minute: start.minute,
        second: 0,
        millisecond: 0,
      });
      const endsAt = day.set({
        hour: end.hour,
        minute: end.minute,
        second: 0,
        millisecond: 0,
      });
      if (endsAt <= startsAt) continue;
      if (endsAt < zoneNow) continue;

      const existing = await prisma.classSession.findFirst({
        where: {
          weeklySlotId: slot.id,
          startsAt: {
            gte: day.toJSDate(),
            lt: day.endOf("day").toJSDate(),
          },
        },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.classSession.create({
        data: {
          classId,
          weeklySlotId: slot.id,
          title: slot.title || "Тренировка",
          startsAt: startsAt.toJSDate(),
          endsAt: endsAt.toJSDate(),
          status: "SCHEDULED",
        },
      });
      created += 1;
    }
  }
  return created;
}

export function isValidWeekday(n: number) {
  return Number.isInteger(n) && n >= 1 && n <= 7;
}

export function normalizeHm(hm: string): string | null {
  const p = parseHm(hm);
  if (!p) return null;
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

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
