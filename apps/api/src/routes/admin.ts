import type { FastifyInstance } from "fastify";
import { ContentStatus, ContentType, Locale, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../lib/auth.js";
import { normalizePhone } from "../services/otp.js";

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
  app.get("/api/coaches", async () => {
    const coaches = await prisma.user.findMany({
      where: { roles: { has: "COACH" }, status: "ACTIVE", deletedAt: null },
      orderBy: { createdAt: "asc" },
      take: 50,
      select: { id: true, firstName: true, lastName: true },
    });
    return { coaches };
  });

  app.get("/api/admin/overview", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const [users, coaches, tariffs, content, payments, paid] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, roles: { has: "COACH" } } }),
      prisma.tariff.count(),
      prisma.contentItem.count(),
      prisma.payment.count(),
      prisma.payment.aggregate({
        where: { status: "SUCCEEDED" },
        _sum: { amountKgs: true },
      }),
    ]);
    return {
      users,
      coaches,
      tariffs,
      content,
      payments,
      paidKgs: paid._sum.amountKgs ?? 0,
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
        firstName: true,
        lastName: true,
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
      firstName?: string;
      lastName?: string;
      roles?: unknown;
      locale?: string;
    };
    const phone = body.phone ? normalizePhone(body.phone) : null;
    if (!phone) return reply.code(400).send({ error: "INVALID_PHONE" });
    const exists = await prisma.user.findUnique({ where: { phone } });
    if (exists) return reply.code(409).send({ error: "PHONE_TAKEN" });
    const user = await prisma.user.create({
      data: {
        phone,
        firstName: text(body.firstName, 80) || null,
        lastName: text(body.lastName, 80) || null,
        roles: asRoles(body.roles),
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

  app.patch("/api/admin/users/:id", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = request.body as {
      firstName?: string;
      lastName?: string;
      phone?: string;
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
      roles?: UserRole[];
      status?: UserStatus;
      locale?: Locale;
    } = {};
    if (body.firstName !== undefined) data.firstName = text(body.firstName, 80) || null;
    if (body.lastName !== undefined) data.lastName = text(body.lastName, 80) || null;
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
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { phone: true, firstName: true, lastName: true } },
        tariff: { include: { translations: true } },
      },
    });
    return {
      payments: payments.map((p) => ({
        id: p.id,
        amountKgs: p.amountKgs,
        status: p.status,
        createdAt: p.createdAt,
        paidAt: p.paidAt,
        user: p.user,
        tariffName: pickTr(p.tariff.translations, "ru")?.name ?? "",
      })),
    };
  });
}
