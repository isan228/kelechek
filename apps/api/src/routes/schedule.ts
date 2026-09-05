import type { FastifyInstance } from "fastify";
import { DateTime } from "luxon";
import { prisma, BISHKEK } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import {
  addTraineeToCoachClass,
  ensureCoachClass,
  ensureUpcomingFromWeeklySlots,
  isValidWeekday,
  normalizeHm,
  notifyCoachTrainees,
  syncClassMembersFromRelations,
} from "../services/schedule.js";
import {
  extractCheckInToken,
  issueSessionCheckInToken,
  verifySessionCheckInToken,
} from "../services/sessionCheckIn.js";

function text(v: unknown, max = 200): string {
  return String(v ?? "").trim().slice(0, max);
}

export async function registerScheduleRoutes(app: FastifyInstance) {
  app.patch("/api/coach/profile", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH"]);
    if (!user) return;
    const body = request.body as {
      sportRu?: string;
      sportKy?: string;
      bioRu?: string;
      bioKy?: string;
      firstName?: string;
      lastName?: string;
    };
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(body.sportRu !== undefined ? { sportRu: text(body.sportRu, 120) || null } : {}),
        ...(body.sportKy !== undefined ? { sportKy: text(body.sportKy, 120) || null } : {}),
        ...(body.bioRu !== undefined ? { bioRu: text(body.bioRu, 2000) || null } : {}),
        ...(body.bioKy !== undefined ? { bioKy: text(body.bioKy, 2000) || null } : {}),
        ...(body.firstName !== undefined ? { firstName: text(body.firstName, 80) || null } : {}),
        ...(body.lastName !== undefined ? { lastName: text(body.lastName, 80) || null } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        sportRu: true,
        sportKy: true,
        bioRu: true,
        bioKy: true,
        photoUrl: true,
      },
    });
    return { coach: updated };
  });

  app.get("/api/coach/sessions", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH"]);
    if (!user) return;
    const cls = await ensureCoachClass(user.id);
    await ensureUpcomingFromWeeklySlots(cls.id);
    const from = DateTime.now().setZone(BISHKEK).minus({ hours: 2 }).toJSDate();
    const sessions = await prisma.classSession.findMany({
      where: {
        classId: cls.id,
        startsAt: { gte: from },
        status: { not: "CANCELED" },
      },
      orderBy: { startsAt: "asc" },
      take: 60,
      include: {
        weeklySlot: { select: { id: true } },
        _count: { select: { attendance: { where: { present: true } } } },
      },
    });
    return {
      classId: cls.id,
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        status: s.status,
        presentCount: s._count.attendance,
        fromWeekly: Boolean(s.weeklySlotId),
      })),
    };
  });

  app.get("/api/coach/sessions/history", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH"]);
    if (!user) return;
    const cls = await ensureCoachClass(user.id);
    const now = new Date();
    const traineeTotal = await prisma.coachingRelation.count({
      where: { coachId: user.id, status: "ACTIVE" },
    });
    const sessions = await prisma.classSession.findMany({
      where: {
        classId: cls.id,
        endsAt: { lt: now },
        status: { not: "CANCELED" },
      },
      orderBy: { startsAt: "desc" },
      take: 80,
      include: {
        _count: { select: { attendance: { where: { present: true } } } },
      },
    });
    return {
      traineeTotal,
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        status: s.status,
        presentCount: s._count.attendance,
        fromWeekly: Boolean(s.weeklySlotId),
      })),
    };
  });

  app.get("/api/coach/weekly-slots", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH"]);
    if (!user) return;
    const cls = await ensureCoachClass(user.id);
    const slots = await prisma.weeklySlot.findMany({
      where: { classId: cls.id },
      orderBy: [{ weekday: "asc" }, { startHm: "asc" }],
    });
    return {
      classId: cls.id,
      slots: slots.map((s) => ({
        id: s.id,
        weekday: s.weekday,
        startHm: s.startHm,
        endHm: s.endHm,
        title: s.title,
        isActive: s.isActive,
      })),
    };
  });

  app.post("/api/coach/weekly-slots", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH"]);
    if (!user) return;
    const body = request.body as {
      weekday?: number;
      startHm?: string;
      endHm?: string;
      title?: string;
    };
    const weekday = Number(body.weekday);
    if (!isValidWeekday(weekday)) return reply.code(400).send({ error: "INVALID_WEEKDAY" });
    const startHm = normalizeHm(String(body.startHm ?? ""));
    const endHm = normalizeHm(String(body.endHm ?? ""));
    if (!startHm || !endHm || endHm <= startHm) {
      return reply.code(400).send({ error: "INVALID_TIME" });
    }
    const title = text(body.title, 160) || "Тренировка";
    const cls = await ensureCoachClass(user.id);
    const slot = await prisma.weeklySlot.create({
      data: {
        classId: cls.id,
        weekday,
        startHm,
        endHm,
        title,
        isActive: true,
      },
    });
    await ensureUpcomingFromWeeklySlots(cls.id);
    const coachName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Тренер";
    await notifyCoachTrainees(user.id, "WEEKLY_SCHEDULE_UPDATED", {
      title,
      weekday,
      startHm,
      endHm,
      coachName,
    });
    return { slot };
  });

  app.patch("/api/coach/weekly-slots/:id", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH"]);
    if (!user) return;
    const { id } = request.params as { id: string };
    const body = request.body as {
      weekday?: number;
      startHm?: string;
      endHm?: string;
      title?: string;
      isActive?: boolean;
    };
    const existing = await prisma.weeklySlot.findFirst({
      where: { id, class: { coachId: user.id } },
    });
    if (!existing) return reply.code(404).send({ error: "NOT_FOUND" });

    const weekday =
      body.weekday !== undefined ? Number(body.weekday) : existing.weekday;
    if (!isValidWeekday(weekday)) return reply.code(400).send({ error: "INVALID_WEEKDAY" });
    const startHm =
      body.startHm !== undefined
        ? normalizeHm(String(body.startHm))
        : existing.startHm;
    const endHm =
      body.endHm !== undefined ? normalizeHm(String(body.endHm)) : existing.endHm;
    if (!startHm || !endHm || endHm <= startHm) {
      return reply.code(400).send({ error: "INVALID_TIME" });
    }

    const slot = await prisma.weeklySlot.update({
      where: { id },
      data: {
        weekday,
        startHm,
        endHm,
        title: body.title !== undefined ? text(body.title, 160) || existing.title : existing.title,
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
    });
    await ensureUpcomingFromWeeklySlots(existing.classId);
    return { slot };
  });

  app.delete("/api/coach/weekly-slots/:id", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH"]);
    if (!user) return;
    const { id } = request.params as { id: string };
    const existing = await prisma.weeklySlot.findFirst({
      where: { id, class: { coachId: user.id } },
    });
    if (!existing) return reply.code(404).send({ error: "NOT_FOUND" });

    const now = new Date();
    await prisma.classSession.deleteMany({
      where: {
        weeklySlotId: id,
        startsAt: { gt: now },
        attendance: { none: {} },
      },
    });
    await prisma.weeklySlot.update({
      where: { id },
      data: { isActive: false },
    });
    return { ok: true };
  });

  app.post("/api/coach/sessions", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH"]);
    if (!user) return;
    const body = request.body as {
      title?: string;
      startsAt?: string;
      endsAt?: string;
    };
    const title = text(body.title, 160) || "Тренировка";
    const startsAt = body.startsAt ? new Date(body.startsAt) : null;
    const endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (!startsAt || Number.isNaN(startsAt.getTime())) {
      return reply.code(400).send({ error: "INVALID_START" });
    }
    if (!endsAt || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      return reply.code(400).send({ error: "INVALID_END" });
    }

    const cls = await ensureCoachClass(user.id);
    await syncClassMembersFromRelations(user.id, cls.id);

    const session = await prisma.classSession.create({
      data: {
        classId: cls.id,
        title,
        startsAt,
        endsAt,
        status: "SCHEDULED",
      },
    });

    const coachName = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Тренер";
    await notifyCoachTrainees(user.id, "SESSION_SCHEDULED", {
      sessionId: session.id,
      title,
      startsAt: session.startsAt.toISOString(),
      endsAt: session.endsAt.toISOString(),
      coachName,
    });

    return { session };
  });

  app.delete("/api/coach/sessions/:id", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH"]);
    if (!user) return;
    const { id } = request.params as { id: string };
    const session = await prisma.classSession.findFirst({
      where: { id, class: { coachId: user.id } },
    });
    if (!session) return reply.code(404).send({ error: "NOT_FOUND" });
    if (session.startsAt < new Date()) {
      return reply.code(400).send({ error: "ALREADY_STARTED" });
    }
    await prisma.attendanceRecord.deleteMany({ where: { sessionId: id } });
    await prisma.classSession.delete({ where: { id } });
    return { ok: true };
  });

  app.get("/api/coach/sessions/:id/qr", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH"]);
    if (!user) return;
    const { id } = request.params as { id: string };
    const session = await prisma.classSession.findFirst({
      where: { id, class: { coachId: user.id } },
      include: {
        attendance: {
          where: { present: true },
          include: {
            trainee: { select: { id: true, firstName: true, lastName: true, phone: true } },
          },
        },
      },
    });
    if (!session) return reply.code(404).send({ error: "NOT_FOUND" });

    const now = Date.now();
    const openFrom = session.startsAt.getTime() - 30 * 60 * 1000;
    const openUntil = session.endsAt.getTime() + 30 * 60 * 1000;
    if (now < openFrom) {
      return reply.code(400).send({ error: "CHECKIN_TOO_EARLY" });
    }
    if (now > openUntil) {
      return reply.code(400).send({ error: "CHECKIN_CLOSED" });
    }

    const { token, joinUrl } = issueSessionCheckInToken(session.id, session.endsAt);
    return {
      session: {
        id: session.id,
        title: session.title,
        startsAt: session.startsAt,
        endsAt: session.endsAt,
      },
      token,
      joinUrl,
      present: session.attendance.map((a) => ({
        id: a.trainee.id,
        firstName: a.trainee.firstName,
        lastName: a.trainee.lastName,
        phone: a.trainee.phone,
        markedAt: a.markedAt,
      })),
    };
  });

  app.post("/api/checkin", async (request, reply) => {
    const user = requireRole(request, reply, ["TRAINEE"]);
    if (!user) return;
    const body = request.body as { token?: string };
    const token = extractCheckInToken(body.token ?? "");
    const parsed = verifySessionCheckInToken(token);
    if (!parsed) return reply.code(400).send({ error: "INVALID_OR_EXPIRED_QR" });

    const session = await prisma.classSession.findUnique({
      where: { id: parsed.sessionId },
      include: { class: true },
    });
    if (!session) return reply.code(404).send({ error: "SESSION_NOT_FOUND" });

    const now = Date.now();
    if (now < session.startsAt.getTime() - 30 * 60 * 1000) {
      return reply.code(400).send({ error: "CHECKIN_TOO_EARLY" });
    }
    if (now > session.endsAt.getTime() + 30 * 60 * 1000) {
      return reply.code(400).send({ error: "CHECKIN_CLOSED" });
    }

    const relation = await prisma.coachingRelation.findFirst({
      where: {
        coachId: session.class.coachId,
        traineeId: user.id,
        status: "ACTIVE",
      },
    });
    if (!relation) return reply.code(403).send({ error: "NOT_YOUR_COACH" });

    await addTraineeToCoachClass(session.class.coachId, user.id);

    const deadline = DateTime.fromJSDate(session.endsAt).plus({ hours: 24 }).toJSDate();
    const existing = await prisma.attendanceRecord.findUnique({
      where: {
        sessionId_traineeId: { sessionId: session.id, traineeId: user.id },
      },
    });
    if (existing?.present) {
      return { ok: true, already: true, session: { id: session.id, title: session.title } };
    }

    if (existing) {
      await prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          present: true,
          status: "MARKED",
          markedById: user.id,
          markedAt: new Date(),
          disputeDeadline: deadline,
        },
      });
    } else {
      await prisma.attendanceRecord.create({
        data: {
          sessionId: session.id,
          traineeId: user.id,
          present: true,
          status: "MARKED",
          markedById: user.id,
          markedAt: new Date(),
          disputeDeadline: deadline,
        },
      });
    }

    return {
      ok: true,
      already: false,
      session: { id: session.id, title: session.title, startsAt: session.startsAt },
    };
  });

  app.get("/api/me/schedule", async (request, reply) => {
    const user = requireRole(request, reply, ["TRAINEE"]);
    if (!user) return;
    const relation = await prisma.coachingRelation.findFirst({
      where: { traineeId: user.id, status: "ACTIVE" },
      include: {
        coach: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            sportRu: true,
            sportKy: true,
          },
        },
      },
    });
    if (!relation) {
      return { coach: null, sessions: [], weeklySlots: [] };
    }

    const cls = await ensureCoachClass(relation.coachId);
    await ensureUpcomingFromWeeklySlots(cls.id);

    const weeklySlots = await prisma.weeklySlot.findMany({
      where: { classId: cls.id, isActive: true },
      orderBy: [{ weekday: "asc" }, { startHm: "asc" }],
    });

    const from = DateTime.now().setZone(BISHKEK).minus({ hours: 2 }).toJSDate();
    const sessions = await prisma.classSession.findMany({
      where: {
        classId: cls.id,
        startsAt: { gte: from },
        status: { not: "CANCELED" },
      },
      orderBy: { startsAt: "asc" },
      take: 40,
      include: {
        attendance: {
          where: { traineeId: user.id },
          select: { present: true, markedAt: true },
        },
      },
    });

    return {
      coach: relation.coach,
      weeklySlots: weeklySlots.map((s) => ({
        id: s.id,
        weekday: s.weekday,
        startHm: s.startHm,
        endHm: s.endHm,
        title: s.title,
      })),
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        status: s.status,
        fromWeekly: Boolean(s.weeklySlotId),
        attended: s.attendance[0]?.present ?? false,
        markedAt: s.attendance[0]?.markedAt ?? null,
      })),
    };
  });

  app.get("/api/me/notifications", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const rows = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      unread: rows.filter((n) => !n.readAt).length,
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        payload: n.payload,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    };
  });

  app.post("/api/me/notifications/read-all", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  });

  app.post("/api/me/notifications/:id/read", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const { id } = request.params as { id: string };
    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { readAt: new Date() },
    });
    return { ok: true };
  });
}
