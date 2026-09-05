import type { FastifyInstance } from "fastify";
import { Locale } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireRole } from "../lib/auth.js";

function text(v: unknown, max = 2000): string {
  return String(v ?? "").trim().slice(0, max);
}

function pickLocale(locale: string): "ru" | "ky" {
  return locale.startsWith("ky") ? "ky" : "ru";
}

export async function registerCmsRoutes(app: FastifyInstance) {
  app.get("/api/gallery", async () => {
    const items = await prisma.galleryItem.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 60,
    });
    return {
      items: items.map((i) => ({
        id: i.id,
        imageUrl: i.imageUrl,
        captionRu: i.captionRu,
        captionKy: i.captionKy,
      })),
    };
  });

  app.get("/api/news", async (request) => {
    const locale = pickLocale(String((request.query as { locale?: string }).locale ?? "ru"));
    const posts = await prisma.newsPost.findMany({
      where: { status: "PUBLISHED" },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 40,
      include: { translations: true },
    });
    return {
      posts: posts.map((p) => {
        const tr = p.translations.find((t) => t.locale === locale) ?? p.translations.find((t) => t.locale === "ru");
        return {
          id: p.id,
          coverUrl: p.coverUrl,
          publishedAt: p.publishedAt ?? p.createdAt,
          title: tr?.title ?? "",
          summary: tr?.summary ?? "",
        };
      }),
    };
  });

  app.get("/api/news/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const locale = pickLocale(String((request.query as { locale?: string }).locale ?? "ru"));
    const post = await prisma.newsPost.findFirst({
      where: { id, status: "PUBLISHED" },
      include: { translations: true },
    });
    if (!post) return reply.code(404).send({ error: "NOT_FOUND" });
    const tr = post.translations.find((t) => t.locale === locale) ?? post.translations.find((t) => t.locale === "ru");
    return {
      post: {
        id: post.id,
        coverUrl: post.coverUrl,
        publishedAt: post.publishedAt ?? post.createdAt,
        title: tr?.title ?? "",
        summary: tr?.summary ?? "",
        body: tr?.body ?? "",
      },
    };
  });

  app.get("/api/admin/gallery", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const items = await prisma.galleryItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 100,
    });
    return { items };
  });

  app.post("/api/admin/gallery", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const body = request.body as {
      imageUrl?: string;
      captionRu?: string;
      captionKy?: string;
      sortOrder?: number;
      isActive?: boolean;
    };
    const imageUrl = text(body.imageUrl, 500);
    if (!imageUrl) return reply.code(400).send({ error: "IMAGE_REQUIRED" });
    const item = await prisma.galleryItem.create({
      data: {
        imageUrl,
        captionRu: text(body.captionRu, 300),
        captionKy: text(body.captionKy, 300),
        sortOrder: Number.isFinite(body.sortOrder) ? Number(body.sortOrder) : 0,
        isActive: body.isActive !== false,
      },
    });
    return { item };
  });

  app.patch("/api/admin/gallery/:id", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = request.body as {
      imageUrl?: string;
      captionRu?: string;
      captionKy?: string;
      sortOrder?: number;
      isActive?: boolean;
    };
    const existing = await prisma.galleryItem.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "NOT_FOUND" });
    const item = await prisma.galleryItem.update({
      where: { id },
      data: {
        ...(body.imageUrl !== undefined ? { imageUrl: text(body.imageUrl, 500) } : {}),
        ...(body.captionRu !== undefined ? { captionRu: text(body.captionRu, 300) } : {}),
        ...(body.captionKy !== undefined ? { captionKy: text(body.captionKy, 300) } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) || 0 } : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
    });
    return { item };
  });

  app.delete("/api/admin/gallery/:id", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const { id } = request.params as { id: string };
    await prisma.galleryItem.deleteMany({ where: { id } });
    return { ok: true };
  });

  app.get("/api/admin/news", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const posts = await prisma.newsPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { translations: true },
    });
    return {
      posts: posts.map((p) => ({
        id: p.id,
        coverUrl: p.coverUrl,
        status: p.status,
        publishedAt: p.publishedAt,
        createdAt: p.createdAt,
        ru: p.translations.find((t) => t.locale === "ru") ?? { title: "", summary: "", body: "" },
        ky: p.translations.find((t) => t.locale === "ky") ?? { title: "", summary: "", body: "" },
      })),
    };
  });

  app.post("/api/admin/news", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const body = request.body as {
      coverUrl?: string;
      status?: string;
      ru?: { title?: string; summary?: string; body?: string };
      ky?: { title?: string; summary?: string; body?: string };
    };
    const published = body.status === "PUBLISHED";
    const post = await prisma.newsPost.create({
      data: {
        coverUrl: text(body.coverUrl, 500) || null,
        status: published ? "PUBLISHED" : "DRAFT",
        publishedAt: published ? new Date() : null,
        translations: {
          create: [
            {
              locale: Locale.ru,
              title: text(body.ru?.title, 200) || "Новость",
              summary: text(body.ru?.summary, 500),
              body: text(body.ru?.body, 20000),
            },
            {
              locale: Locale.ky,
              title: text(body.ky?.title, 200) || "Жаңылык",
              summary: text(body.ky?.summary, 500),
              body: text(body.ky?.body, 20000),
            },
          ],
        },
      },
    });
    return { id: post.id };
  });

  app.patch("/api/admin/news/:id", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = request.body as {
      coverUrl?: string;
      status?: string;
      ru?: { title?: string; summary?: string; body?: string };
      ky?: { title?: string; summary?: string; body?: string };
    };
    const existing = await prisma.newsPost.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: "NOT_FOUND" });
    const published = body.status === "PUBLISHED";

    await prisma.$transaction(async (tx) => {
      await tx.newsPost.update({
        where: { id },
        data: {
          ...(body.coverUrl !== undefined ? { coverUrl: text(body.coverUrl, 500) || null } : {}),
          ...(body.status !== undefined
            ? {
                status: published ? "PUBLISHED" : "DRAFT",
                publishedAt: published ? existing.publishedAt ?? new Date() : existing.publishedAt,
              }
            : {}),
        },
      });
      for (const locale of [Locale.ru, Locale.ky] as const) {
        const pack = locale === "ru" ? body.ru : body.ky;
        if (!pack) continue;
        await tx.newsPostI18n.upsert({
          where: { postId_locale: { postId: id, locale } },
          create: {
            postId: id,
            locale,
            title: text(pack.title, 200) || "Новость",
            summary: text(pack.summary, 500),
            body: text(pack.body, 20000),
          },
          update: {
            title: text(pack.title, 200) || "Новость",
            summary: text(pack.summary, 500),
            body: text(pack.body, 20000),
          },
        });
      }
    });
    return { ok: true };
  });

  app.delete("/api/admin/news/:id", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN", "CONTENT_EDITOR"]);
    if (!admin) return;
    const { id } = request.params as { id: string };
    await prisma.newsPost.deleteMany({ where: { id } });
    return { ok: true };
  });
}
