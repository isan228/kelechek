import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../lib/auth.js";
import { isContentAccessible } from "../services/access.js";
import { endRelation, respondInvitation, sendInvitation } from "../services/invitations.js";
import { normalizePhone } from "../services/otp.js";

function pickI18n<T extends { locale: string }>(rows: T[], locale: string): T | undefined {
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === "ru") ?? rows[0];
}

export async function registerContentRoutes(app: FastifyInstance) {
  app.get("/api/content", async (request) => {
    const q = request.query as { locale?: string };
    const locale = request.authUser?.locale ?? (q.locale === "ky" ? "ky" : "ru");
    const canReadBody = request.authUser
      ? await isContentAccessible(prisma, request.authUser.id, request.authUser.roles)
      : false;
    const items = await prisma.contentItem.findMany({
      where: { status: "PUBLISHED" },
      include: { translations: true, tags: { include: { tag: { include: { translations: true } } } } },
      orderBy: { publishedAt: "desc" },
    });
    return {
      canReadBody,
      items: items.map((item) => {
        const tr = pickI18n(item.translations, locale);
        return {
          id: item.id,
          type: item.type,
          title: tr?.title ?? "",
          summary: tr?.summary ?? "",
          bodyAvailable: canReadBody || item.accessPolicy === "FREE_PREVIEW",
          tags: item.tags.map((t) => pickI18n(t.tag.translations, locale)?.name).filter(Boolean),
        };
      }),
    };
  });

  app.get("/api/content/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = request.query as { locale?: string };
    const locale = request.authUser?.locale ?? (q.locale === "ky" ? "ky" : "ru");
    const item = await prisma.contentItem.findFirst({
      where: { id, status: "PUBLISHED" },
      include: { translations: true },
    });
    if (!item) return reply.code(404).send({ error: "NOT_FOUND" });
    const canReadBody = request.authUser
      ? await isContentAccessible(prisma, request.authUser.id, request.authUser.roles)
      : false;
    const tr = pickI18n(item.translations, locale);
    const bodyAllowed = canReadBody || item.accessPolicy === "FREE_PREVIEW";
    return {
      id: item.id,
      type: item.type,
      title: tr?.title ?? "",
      summary: tr?.summary ?? "",
      bodyAvailable: bodyAllowed,
      bodyRich: bodyAllowed ? (tr?.bodyRich ?? "") : null,
      contraindications: bodyAllowed ? (tr?.contraindications ?? null) : null,
    };
  });

  app.post("/api/content/:id/favorite", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const { id } = request.params as { id: string };
    await prisma.contentFavorite.upsert({
      where: { userId_itemId: { userId: user.id, itemId: id } },
      create: { userId: user.id, itemId: id },
      update: {},
    });
    return { ok: true };
  });

  app.delete("/api/content/:id/favorite", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const { id } = request.params as { id: string };
    await prisma.contentFavorite.deleteMany({
      where: { userId: user.id, itemId: id },
    });
    return { ok: true };
  });
}

export async function registerInvitationRoutes(app: FastifyInstance) {
  app.get("/api/me/invitations", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const invites = await prisma.coachingInvitation.findMany({
      where: { traineeId: user.id, status: "SENT" },
      include: { coach: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    const relation = await prisma.coachingRelation.findFirst({
      where: { traineeId: user.id, status: "ACTIVE" },
      include: { coach: { select: { id: true, firstName: true, lastName: true } } },
    });
    return { invites, relation };
  });

  app.post("/api/invitations/:id/respond", async (request, reply) => {
    const user = requireRole(request, reply, ["TRAINEE"]);
    if (!user) return;
    const { id } = request.params as { id: string };
    const body = request.body as { accept?: boolean; confirmReplace?: boolean };
    try {
      const result = await respondInvitation(user.id, id, Boolean(body.accept), Boolean(body.confirmReplace));
      return { invitation: result };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      return reply.code(status).send({ error: (err as Error).message });
    }
  });

  app.post("/api/me/relation/end", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const body = (request.body ?? {}) as { traineeId?: string };
    try {
      await endRelation(user.id, false, body.traineeId);
      return { ok: true };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      return reply.code(status).send({ error: (err as Error).message });
    }
  });

  app.post("/api/coach/invitations", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH", "ADMIN"]);
    if (!user) return;
    const body = request.body as { phone?: string };
    const phone = body.phone ? normalizePhone(body.phone) : null;
    if (!phone) return reply.code(400).send({ error: "INVALID_PHONE" });
    try {
      const result = await sendInvitation(user.id, phone);
      return result;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      return reply.code(status).send({ error: (err as Error).message });
    }
  });

  app.get("/api/coach/trainees", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH", "ADMIN"]);
    if (!user) return;
    const relations = await prisma.coachingRelation.findMany({
      where: { coachId: user.id, status: "ACTIVE" },
      include: {
        trainee: { select: { id: true, firstName: true, lastName: true, phone: true, login: true } },
      },
      take: 100,
    });
    return {
      trainees: relations.map((r) => ({
        id: r.trainee.id,
        firstName: r.trainee.firstName,
        lastName: r.trainee.lastName,
        phone: r.trainee.phone,
        login: r.trainee.login,
        relationStartedAt: r.startedAt,
      })),
    };
  });

  app.get("/api/coach/dashboard", async (request, reply) => {
    const user = requireRole(request, reply, ["COACH", "ADMIN"]);
    if (!user) return;

    const full = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        login: true,
        phone: true,
        firstName: true,
        lastName: true,
        bioRu: true,
        bioKy: true,
        photoUrl: true,
        locale: true,
        createdAt: true,
      },
    });
    if (!full) return reply.code(404).send({ error: "NOT_FOUND" });

    const [relations, counter, earned, pendingInvites] = await Promise.all([
      prisma.coachingRelation.findMany({
        where: { coachId: user.id, status: "ACTIVE" },
        include: {
          trainee: {
            select: {
              id: true,
              login: true,
              firstName: true,
              lastName: true,
              phone: true,
              memberships: {
                where: { status: "ACTIVE", endsAtExclusive: { gt: new Date() } },
                orderBy: { endsAtExclusive: "desc" },
                take: 1,
                select: { endsAtExclusive: true },
              },
            },
          },
        },
        orderBy: { startedAt: "desc" },
        take: 100,
      }),
      prisma.coachCounter.findUnique({ where: { coachId: user.id } }),
      prisma.coachLedgerEntry.aggregate({
        where: { coachId: user.id },
        _sum: { signedAmount: true },
      }),
      prisma.coachingInvitation.count({
        where: { coachId: user.id, status: "SENT", expiresAt: { gt: new Date() } },
      }),
    ]);

    return {
      coach: full,
      traineeCount: counter?.activeRelationCount ?? relations.length,
      earnedKgs: earned._sum.signedAmount ?? 0,
      pendingInvites,
      trainees: relations.map((r) => ({
        id: r.trainee.id,
        login: r.trainee.login,
        firstName: r.trainee.firstName,
        lastName: r.trainee.lastName,
        phone: r.trainee.phone,
        relationStartedAt: r.startedAt,
        membershipEndsAt: r.trainee.memberships[0]?.endsAtExclusive ?? null,
      })),
    };
  });
}
