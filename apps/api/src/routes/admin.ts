import { createWriteStream } from "node:fs";
import { extname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ContentStatus, ContentType, Locale, UserRole, UserStatus } from "@prisma/client";
import { DEFAULT_PHOTOS, SITE_PHOTO_KEYS, SITE_PHOTO_SLOTS, SITE_TEXT_GROUPS } from "@kelech/shared";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../lib/auth.js";
import { ensureUploadsDir, UPLOADS_DIR } from "../lib/uploads.js";
import { normalizePhone } from "../services/otp.js";
import { hashPassword, normalizeLogin, validatePassword } from "../services/password.js";
import { getSitePhotosMap, setSitePhotoUrl } from "../services/siteAssets.js";
import { getSiteTextsMap, upsertSiteTexts } from "../services/siteTexts.js";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

async function saveUploadedImage(
  request: FastifyRequest,
  reply: FastifyReply,
  prefix: string,
): Promise<string | null> {
  const part = await request.file();
  if (!part) {
    void reply.code(400).send({ error: "NO_FILE" });
    return null;
  }
  if (!part.mimetype.startsWith("image/")) {
    void reply.code(400).send({ error: "NOT_IMAGE" });
    return null;
  }
  const ext = extname(part.filename || "").toLowerCase() || ".jpg";
  if (!IMAGE_EXT.has(ext)) {
    void reply.code(400).send({ error: "BAD_EXT" });
    return null;
  }
  ensureUploadsDir();
  const name = `${prefix}-${Date.now()}${ext === ".jpeg" ? ".jpg" : ext}`;
  await pipeline(part.file, createWriteStream(join(UPLOADS_DIR, name)));
  return `/api/media/${name}`;
}

const ROLES: UserRole[] = ["TRAINEE", "COACH", "ADMIN", "CONTENT_EDITOR"];
const STATUSES: UserStatus[] = ["ACTIVE", "BLOCKED"];
const CONTENT_TYPES: ContentType[] = ["ARTICLE", "EXERCISE", "PROGRAM"];
const CONTENT_STATUSES: ContentStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "SCHEDULED",
  "PUBLISHED",
  "UNPUBLISHED",
  "ARCHIVED",
];

function asRoles(value: unknown): UserRole[] {
  if (!Array.isArray(value)) return ["TRAINEE"];
  const next = value.filter((r): r is UserRole => typeof r === "string" && ROLES.includes(r as UserRole));
  return next.length ? next : ["TRAINEE"];
}

function pickTr<T extends { locale: string }>(rows: T[], locale: Locale): T | undefined {
  return rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === "ru") ?? rows[0];
}

function text(v: unknown, max = 4000): string {
  return String(v ?? "").trim().slice(0, max);
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get("/api/site-texts", async (request) => {
    const q = request.query as { locale?: string };
    const locale = q.locale === "ky" ? Locale.ky : Locale.ru;
    const texts = await getSiteTextsMap(locale);
    return { locale, texts, groups: SITE_TEXT_GROUPS };
  });

  app.get("/api/site-photos", async () => {
    const photos = await getSitePhotosMap();
    return { photos, slots: SITE_PHOTO_SLOTS };
  });

  app.get("/api/coaches", async (request) => {
    const q = request.query as { locale?: string };
    const locale = q.locale === "ky" ? "ky" : "ru";
    const coaches = await prisma.user.findMany({
      where: { roles: { has: "COACH" }, status: "ACTIVE", deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bioRu: true,
        bioKy: true,
        sportRu: true,
        sportKy: true,
        photoUrl: true,
      },
    });
    return {
      coaches: coaches.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        bio: (locale === "ky" ? c.bioKy : c.bioRu) || c.bioRu || c.bioKy || null,
        sport: (locale === "ky" ? c.sportKy : c.sportRu) || c.sportRu || c.sportKy || null,
        photoUrl: c.photoUrl,
      })),
    };
  });

  app.get("/api/admin/overview", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const now = new Date();
    const succeeded = { status: "SUCCEEDED" as const };

    const soloWhere = { ...succeeded, coachId: null };
    const withCoachWhere = { ...succeeded, coachId: { not: null } };

    const [
      users,
      trainees,
      coaches,
      tariffs,
      content,
      payments,
      pendingPayments,
      failedPayments,
      succeededCount,
      paid,
      shares,
      soloCount,
      withCoachCount,
      soloAgg,
      withCoachAgg,
      activeMemberships,
      activeRelations,
      operatorLedger,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, roles: { has: "TRAINEE" } } }),
      prisma.user.count({ where: { deletedAt: null, roles: { has: "COACH" } } }),
      prisma.tariff.count(),
      prisma.contentItem.count(),
      prisma.payment.count(),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.payment.count({ where: { status: { in: ["FAILED", "CANCELED"] } } }),
      prisma.payment.count({ where: succeeded }),
      prisma.payment.aggregate({
        where: succeeded,
        _sum: { amountKgs: true },
      }),
      prisma.payment.aggregate({
        where: succeeded,
        _sum: {
          traineeShareKgs: true,
          coachShareKgs: true,
          operatorShareKgs: true,
        },
      }),
      prisma.payment.count({ where: soloWhere }),
      prisma.payment.count({ where: withCoachWhere }),
      prisma.payment.aggregate({
        where: soloWhere,
        _sum: {
          amountKgs: true,
          traineeShareKgs: true,
          coachShareKgs: true,
          operatorShareKgs: true,
        },
      }),
      prisma.payment.aggregate({
        where: withCoachWhere,
        _sum: {
          amountKgs: true,
          traineeShareKgs: true,
          coachShareKgs: true,
          operatorShareKgs: true,
        },
      }),
      prisma.membershipPeriod.count({
        where: { status: "ACTIVE", endsAtExclusive: { gt: now } },
      }),
      prisma.coachingRelation.count({ where: { status: "ACTIVE" } }),
      prisma.operatorLedgerEntry.aggregate({ _sum: { signedAmount: true } }),
    ]);

    const paidKgs = paid._sum.amountKgs ?? 0;
    const traineeShareKgs = shares._sum.traineeShareKgs ?? 0;
    const coachShareKgs = shares._sum.coachShareKgs ?? 0;
    const operatorShareKgs = shares._sum.operatorShareKgs ?? 0;

    return {
      users,
      trainees,
      coaches,
      tariffs,
      content,
      payments,
      pendingPayments,
      failedPayments,
      succeededPayments: succeededCount,
      paidKgs,
      traineeShareKgs,
      coachShareKgs,
      operatorShareKgs,
      operatorLedgerKgs: operatorLedger._sum.signedAmount ?? 0,
      withCoachPayments: withCoachCount,
      soloPayments: soloCount,
      activeMemberships,
      activeRelations,
      rates: {
        solo: { traineePct: 82, coachPct: 0, operatorPct: 18 },
        withCoach: { traineePct: 32, coachPct: 50, operatorPct: 18 },
      },
      byMode: {
        solo: {
          count: soloCount,
          paidKgs: soloAgg._sum.amountKgs ?? 0,
          traineeShareKgs: soloAgg._sum.traineeShareKgs ?? 0,
          coachShareKgs: soloAgg._sum.coachShareKgs ?? 0,
          operatorShareKgs: soloAgg._sum.operatorShareKgs ?? 0,
        },
        withCoach: {
          count: withCoachCount,
          paidKgs: withCoachAgg._sum.amountKgs ?? 0,
          traineeShareKgs: withCoachAgg._sum.traineeShareKgs ?? 0,
          coachShareKgs: withCoachAgg._sum.coachShareKgs ?? 0,
          operatorShareKgs: withCoachAgg._sum.operatorShareKgs ?? 0,
        },
      },
    };
  });

  app.get("/api/admin/users", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const q = ((request.query as { q?: string }).q ?? "").trim();
    const users = await prisma.user.findMany({
      where: q
        ? {
            deletedAt: null,
            OR: [
              { phone: { contains: q } },
              { login: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
            ],
          }
        : { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        phone: true,
        login: true,
        firstName: true,
        lastName: true,
        bioRu: true,
        bioKy: true,
        photoUrl: true,
        locale: true,
        roles: true,
        status: true,
        createdAt: true,
      },
    });
    return { users };
  });

  app.post("/api/admin/users", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const body = request.body as {
      phone?: string;
      login?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      bioRu?: string;
      bioKy?: string;
      photoUrl?: string;
      roles?: unknown;
      locale?: string;
    };
    let phone = body.phone ? normalizePhone(body.phone) : null;
    const roles = asRoles(body.roles);
    const login = body.login ? normalizeLogin(body.login) : null;
    if (body.login && !login) return reply.code(400).send({ error: "INVALID_LOGIN" });
    if (body.password && !validatePassword(body.password)) {
      return reply.code(400).send({ error: "INVALID_PASSWORD" });
    }
    if (roles.includes("COACH") && (!body.password || !login)) {
      return reply.code(400).send({ error: "INVALID_PASSWORD" });
    }

    // Для тренера телефон можно не указывать — сгенерируем уникальный служебный.
    if (!phone && roles.includes("COACH")) {
      for (let i = 0; i < 8; i++) {
        const candidate = `+9967${String(Math.floor(10000000 + Math.random() * 89999999))}`;
        const taken = await prisma.user.findFirst({ where: { phone: candidate } });
        if (!taken) {
          phone = candidate;
          break;
        }
      }
    }
    if (!phone) return reply.code(400).send({ error: "INVALID_PHONE" });

    const exists = await prisma.user.findFirst({
      where: { OR: [{ phone }, ...(login ? [{ login }] : [])] },
    });
    if (exists?.phone === phone) return reply.code(409).send({ error: "PHONE_TAKEN" });
    if (login && exists?.login === login) return reply.code(409).send({ error: "LOGIN_TAKEN" });
    const user = await prisma.user.create({
      data: {
        phone,
        login,
        passwordHash: body.password ? await hashPassword(body.password) : null,
        firstName: text(body.firstName, 80) || null,
        lastName: text(body.lastName, 80) || null,
        bioRu: text(body.bioRu, 2000) || null,
        bioKy: text(body.bioKy, 2000) || null,
        photoUrl: text(body.photoUrl, 500) || null,
        roles,
        locale: body.locale === "ky" ? Locale.ky : Locale.ru,
        phoneVerifiedAt: new Date(),
      },
    });
    if (user.roles.includes("COACH")) {
      await prisma.coachCounter.upsert({
        where: { coachId: user.id },
        create: { coachId: user.id, activeRelationCount: 0 },
        update: {},
      });
    }
    return { user };
  });

  app.post("/api/admin/coaches", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const body = request.body as {
      login?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      bioRu?: string;
      bioKy?: string;
      sportRu?: string;
      sportKy?: string;
      photoUrl?: string;
    };
    const login = body.login ? normalizeLogin(body.login) : null;
    if (!login) return reply.code(400).send({ error: "INVALID_LOGIN" });
    if (!body.password || !validatePassword(body.password)) {
      return reply.code(400).send({ error: "INVALID_PASSWORD" });
    }
    const firstName = text(body.firstName, 80);
    const lastName = text(body.lastName, 80);
    if (!firstName || !lastName) return reply.code(400).send({ error: "NAME_REQUIRED" });

    let phone = body.phone ? normalizePhone(body.phone) : null;
    if (!phone) {
      for (let i = 0; i < 8; i++) {
        const candidate = `+9967${String(Math.floor(10000000 + Math.random() * 89999999))}`;
        const taken = await prisma.user.findFirst({ where: { phone: candidate } });
        if (!taken) {
          phone = candidate;
          break;
        }
      }
    }
    if (!phone) return reply.code(400).send({ error: "INVALID_PHONE" });

    const exists = await prisma.user.findFirst({
      where: { OR: [{ phone }, { login }] },
    });
    if (exists?.login === login) return reply.code(409).send({ error: "LOGIN_TAKEN" });
    if (exists?.phone === phone) return reply.code(409).send({ error: "PHONE_TAKEN" });

    const user = await prisma.user.create({
      data: {
        phone,
        login,
        passwordHash: await hashPassword(body.password),
        firstName,
        lastName,
        bioRu: text(body.bioRu, 2000) || null,
        bioKy: text(body.bioKy, 2000) || null,
        sportRu: text(body.sportRu, 120) || null,
        sportKy: text(body.sportKy, 120) || null,
        photoUrl: text(body.photoUrl, 500) || null,
        roles: [UserRole.COACH],
        locale: Locale.ru,
        phoneVerifiedAt: new Date(),
        coachCounter: { create: { activeRelationCount: 0 } },
      },
    });
    return { user };
  });

  app.get("/api/admin/coaches", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const coaches = await prisma.user.findMany({
      where: { roles: { has: "COACH" }, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        login: true,
        phone: true,
        firstName: true,
        lastName: true,
        bioRu: true,
        bioKy: true,
        photoUrl: true,
        status: true,
        createdAt: true,
        coachCounter: { select: { activeRelationCount: true } },
      },
    });
    return {
      coaches: coaches.map((c) => ({
        ...c,
        traineeCount: c.coachCounter?.activeRelationCount ?? 0,
      })),
    };
  });


  app.patch("/api/admin/users/:id", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = request.body as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      login?: string;
      password?: string;
      bioRu?: string;
      bioKy?: string;
      photoUrl?: string;
      roles?: unknown;
      status?: string;
      locale?: string;
    };
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) return reply.code(404).send({ error: "NOT_FOUND" });

    const data: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string;
      login?: string | null;
      passwordHash?: string;
      bioRu?: string | null;
      bioKy?: string | null;
      photoUrl?: string | null;
      roles?: UserRole[];
      status?: UserStatus;
      locale?: Locale;
    } = {};
    if (body.firstName !== undefined) data.firstName = text(body.firstName, 80) || null;
    if (body.lastName !== undefined) data.lastName = text(body.lastName, 80) || null;
    if (body.bioRu !== undefined) data.bioRu = text(body.bioRu, 2000) || null;
    if (body.bioKy !== undefined) data.bioKy = text(body.bioKy, 2000) || null;
    if (body.photoUrl !== undefined) data.photoUrl = text(body.photoUrl, 500) || null;
    if (body.locale === "ru" || body.locale === "ky") data.locale = body.locale;
    if (body.status && STATUSES.includes(body.status as UserStatus)) {
      data.status = body.status as UserStatus;
    }
    if (body.roles) {
      const roles = asRoles(body.roles);
      if (id === admin.id && !roles.includes("ADMIN")) {
        return reply.code(400).send({ error: "CANNOT_DROP_SELF_ADMIN" });
      }
      data.roles = roles;
    }
    if (body.phone) {
      const phone = normalizePhone(body.phone);
      if (!phone) return reply.code(400).send({ error: "INVALID_PHONE" });
      data.phone = phone;
    }
    if (body.login !== undefined) {
      if (!body.login) {
        data.login = null;
      } else {
        const login = normalizeLogin(body.login);
        if (!login) return reply.code(400).send({ error: "INVALID_LOGIN" });
        data.login = login;
      }
    }
    if (body.password) {
      if (!validatePassword(body.password)) return reply.code(400).send({ error: "INVALID_PASSWORD" });
      data.passwordHash = await hashPassword(body.password);
    }

    try {
      const user = await prisma.user.update({ where: { id }, data });
      if (user.roles.includes("COACH")) {
        await prisma.coachCounter.upsert({
          where: { coachId: user.id },
          create: { coachId: user.id, activeRelationCount: 0 },
          update: {},
        });
      }
      return { user };
    } catch {
      return reply.code(409).send({ error: "PHONE_TAKEN" });
    }
  });

  app.get("/api/admin/tariffs", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const tariffs = await prisma.tariff.findMany({
      include: { translations: true },
      orderBy: { priceKgs: "asc" },
    });
    return {
      tariffs: tariffs.map((t) => ({
        id: t.id,
        priceKgs: t.priceKgs,
        periodDays: t.periodDays,
        isActive: t.isActive,
        ru: {
          name: pickTr(t.translations, "ru")?.name ?? "",
          description: pickTr(t.translations, "ru")?.description ?? "",
        },
        ky: {
          name: pickTr(t.translations, "ky")?.name ?? "",
          description: pickTr(t.translations, "ky")?.description ?? "",
        },
      })),
    };
  });

  app.post("/api/admin/tariffs", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const body = request.body as {
      priceKgs?: number;
      periodDays?: number;
      isActive?: boolean;
      ru?: { name?: string; description?: string };
      ky?: { name?: string; description?: string };
    };
    const priceKgs = Number(body.priceKgs);
    const periodDays = Number(body.periodDays ?? 30);
    if (!Number.isInteger(priceKgs) || priceKgs < 1) {
      return reply.code(400).send({ error: "INVALID_PRICE" });
    }
    if (!Number.isInteger(periodDays) || periodDays < 1) {
      return reply.code(400).send({ error: "INVALID_PERIOD" });
    }
    const tariff = await prisma.tariff.create({
      data: {
        priceKgs,
        periodDays,
        isActive: body.isActive !== false,
        translations: {
          create: [
            {
              locale: Locale.ru,
              name: text(body.ru?.name, 120) || "Абонемент",
              description: text(body.ru?.description, 800),
            },
            {
              locale: Locale.ky,
              name: text(body.ky?.name, 120) || text(body.ru?.name, 120) || "Абонемент",
              description: text(body.ky?.description, 800),
            },
          ],
        },
      },
      include: { translations: true },
    });
    return { tariff };
  });

  app.patch("/api/admin/tariffs/:id", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = request.body as {
      priceKgs?: number;
      periodDays?: number;
      isActive?: boolean;
      ru?: { name?: string; description?: string };
      ky?: { name?: string; description?: string };
    };
    const existing = await prisma.tariff.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "NOT_FOUND" });

    const data: { priceKgs?: number; periodDays?: number; isActive?: boolean } = {};
    if (body.priceKgs !== undefined) {
      const priceKgs = Number(body.priceKgs);
      if (!Number.isInteger(priceKgs) || priceKgs < 1) return reply.code(400).send({ error: "INVALID_PRICE" });
      data.priceKgs = priceKgs;
    }
    if (body.periodDays !== undefined) {
      const periodDays = Number(body.periodDays);
      if (!Number.isInteger(periodDays) || periodDays < 1) return reply.code(400).send({ error: "INVALID_PERIOD" });
      data.periodDays = periodDays;
    }
    if (typeof body.isActive === "boolean") data.isActive = body.isActive;

    const tariff = await prisma.$transaction(async (tx) => {
      await tx.tariff.update({ where: { id }, data });
      for (const locale of [Locale.ru, Locale.ky] as const) {
        const pack = locale === "ru" ? body.ru : body.ky;
        if (!pack) continue;
        await tx.tariffI18n.upsert({
          where: { tariffId_locale: { tariffId: id, locale } },
          create: {
            tariffId: id,
            locale,
            name: text(pack.name, 120) || "Абонемент",
            description: text(pack.description, 800),
          },
          update: {
            name: text(pack.name, 120) || "Абонемент",
            description: text(pack.description, 800),
          },
        });
      }
      return tx.tariff.findUniqueOrThrow({ where: { id }, include: { translations: true } });
    });
    return { tariff };
  });

  app.get("/api/admin/content", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const items = await prisma.contentItem.findMany({
      include: { translations: true },
      orderBy: { publishedAt: "desc" },
      take: 200,
    });
    return {
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        status: item.status,
        ru: {
          title: pickTr(item.translations, "ru")?.title ?? "",
          summary: pickTr(item.translations, "ru")?.summary ?? "",
          bodyRich: pickTr(item.translations, "ru")?.bodyRich ?? "",
          contraindications: pickTr(item.translations, "ru")?.contraindications ?? "",
        },
        ky: {
          title: pickTr(item.translations, "ky")?.title ?? "",
          summary: pickTr(item.translations, "ky")?.summary ?? "",
          bodyRich: pickTr(item.translations, "ky")?.bodyRich ?? "",
          contraindications: pickTr(item.translations, "ky")?.contraindications ?? "",
        },
      })),
    };
  });

  app.post("/api/admin/content", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const body = request.body as {
      type?: string;
      status?: string;
      ru?: { title?: string; summary?: string; bodyRich?: string; contraindications?: string };
      ky?: { title?: string; summary?: string; bodyRich?: string; contraindications?: string };
    };
    const type = CONTENT_TYPES.includes(body.type as ContentType) ? (body.type as ContentType) : "ARTICLE";
    const status = CONTENT_STATUSES.includes(body.status as ContentStatus)
      ? (body.status as ContentStatus)
      : "DRAFT";
    const published = status === "PUBLISHED";
    const item = await prisma.contentItem.create({
      data: {
        type,
        status,
        authorId: admin.id,
        reviewerId: published ? admin.id : null,
        reviewedAt: published ? new Date() : null,
        publishedAt: published ? new Date() : null,
        bodyJson: {},
        translations: {
          create: [
            {
              locale: Locale.ru,
              title: text(body.ru?.title, 200) || "Без названия",
              summary: text(body.ru?.summary, 500),
              bodyRich: text(body.ru?.bodyRich, 20000),
              contraindications: text(body.ru?.contraindications, 1000) || null,
            },
            {
              locale: Locale.ky,
              title: text(body.ky?.title, 200) || text(body.ru?.title, 200) || "Аталышы жок",
              summary: text(body.ky?.summary, 500),
              bodyRich: text(body.ky?.bodyRich, 20000),
              contraindications: text(body.ky?.contraindications, 1000) || null,
            },
          ],
        },
      },
    });
    return { item: { id: item.id } };
  });

  app.patch("/api/admin/content/:id", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = request.body as {
      type?: string;
      status?: string;
      ru?: { title?: string; summary?: string; bodyRich?: string; contraindications?: string };
      ky?: { title?: string; summary?: string; bodyRich?: string; contraindications?: string };
    };
    const existing = await prisma.contentItem.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "NOT_FOUND" });

    const type = CONTENT_TYPES.includes(body.type as ContentType) ? (body.type as ContentType) : existing.type;
    const status = CONTENT_STATUSES.includes(body.status as ContentStatus)
      ? (body.status as ContentStatus)
      : existing.status;
    const published = status === "PUBLISHED";

    await prisma.$transaction(async (tx) => {
      await tx.contentItem.update({
        where: { id },
        data: {
          type,
          status,
          reviewerId: published ? admin.id : existing.reviewerId,
          reviewedAt: published ? new Date() : existing.reviewedAt,
          publishedAt: published ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
        },
      });
      for (const locale of [Locale.ru, Locale.ky] as const) {
        const pack = locale === "ru" ? body.ru : body.ky;
        if (!pack) continue;
        await tx.contentItemI18n.upsert({
          where: { itemId_locale: { itemId: id, locale } },
          create: {
            itemId: id,
            locale,
            title: text(pack.title, 200) || "Без названия",
            summary: text(pack.summary, 500),
            bodyRich: text(pack.bodyRich, 20000),
            contraindications: text(pack.contraindications, 1000) || null,
          },
          update: {
            title: text(pack.title, 200) || "Без названия",
            summary: text(pack.summary, 500),
            bodyRich: text(pack.bodyRich, 20000),
            contraindications: text(pack.contraindications, 1000) || null,
          },
        });
      }
    });
    return { ok: true };
  });

  app.delete("/api/admin/content/:id", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const { id } = request.params as { id: string };
    await prisma.contentItem.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
    return { ok: true };
  });

  app.get("/api/admin/payments", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const payments = await prisma.payment.findMany({
      where: { status: "SUCCEEDED" },
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        user: {
          select: {
            phone: true,
            login: true,
            firstName: true,
            lastName: true,
          },
        },
        tariff: { include: { translations: true } },
      },
    });

    const coachIds = [
      ...new Set(payments.map((p) => p.coachId).filter((id): id is string => Boolean(id))),
    ];
    const coaches =
      coachIds.length === 0
        ? []
        : await prisma.user.findMany({
            where: { id: { in: coachIds } },
            select: { id: true, firstName: true, lastName: true, login: true, phone: true },
          });
    const coachById = new Map(coaches.map((c) => [c.id, c]));

    return {
      payments: payments.map((p) => {
        const coach = p.coachId ? coachById.get(p.coachId) ?? null : null;
        return {
          id: p.id,
          amountKgs: p.amountKgs,
          status: p.status,
          createdAt: p.createdAt,
          paidAt: p.paidAt,
          hasCoach: Boolean(p.coachId),
          traineeShareKgs: p.traineeShareKgs,
          coachShareKgs: p.coachShareKgs,
          operatorShareKgs: p.operatorShareKgs,
          traineeRateBps: p.traineeRateBps,
          coachRateBps: p.coachRateBps,
          user: p.user,
          coach: coach
            ? {
                id: coach.id,
                firstName: coach.firstName,
                lastName: coach.lastName,
                login: coach.login,
                phone: coach.phone,
              }
            : null,
          tariffName: pickTr(p.tariff.translations, "ru")?.name ?? "",
        };
      }),
    };
  });

  app.get("/api/admin/site-texts", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const rows = await prisma.siteText.findMany();
    const byKey: Record<string, { ru: string; ky: string }> = {};
    for (const row of rows) {
      if (!byKey[row.key]) byKey[row.key] = { ru: "", ky: "" };
      byKey[row.key][row.locale] = row.value;
    }
    return { groups: SITE_TEXT_GROUPS, texts: byKey };
  });

  app.put("/api/admin/site-texts", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const body = request.body as {
      items?: { key: string; locale: "ru" | "ky"; value: string }[];
    };
    const items = (body.items ?? [])
      .filter((i) => i.key && (i.locale === "ru" || i.locale === "ky"))
      .map((i) => ({
        key: i.key,
        locale: i.locale === "ky" ? Locale.ky : Locale.ru,
        value: text(i.value, 8000),
      }));
    const saved = await upsertSiteTexts(items);
    return { ok: true, saved };
  });

  app.get("/api/admin/site-photos", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const photos = await getSitePhotosMap();
    return { slots: SITE_PHOTO_SLOTS, photos };
  });

  app.post("/api/admin/site-photos/:key", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const key = (request.params as { key: string }).key;
    if (!(SITE_PHOTO_KEYS as string[]).includes(key)) {
      return reply.code(400).send({ error: "UNKNOWN_SLOT" });
    }
    const url = await saveUploadedImage(request, reply, `site-${key}`);
    if (!url) return;
    await setSitePhotoUrl(key, url);
    return { ok: true, key, url };
  });

  app.post("/api/admin/site-photos/:key/reset", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const key = (request.params as { key: string }).key;
    if (!(SITE_PHOTO_KEYS as string[]).includes(key)) {
      return reply.code(400).send({ error: "UNKNOWN_SLOT" });
    }
    const url = DEFAULT_PHOTOS[key] ?? "";
    await setSitePhotoUrl(key, url);
    return { ok: true, key, url };
  });

  app.post("/api/admin/media", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const url = await saveUploadedImage(request, reply, "media");
    if (!url) return;
    return { ok: true, url };
  });
}
