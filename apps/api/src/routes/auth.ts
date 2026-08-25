import type { FastifyInstance } from "fastify";
import { Locale, UserRole } from "@prisma/client";
import { prisma, COOKIE_NAME } from "../lib/prisma.js";
import { requireAuth, setSessionCookie, signSession } from "../lib/auth.js";
import { normalizePhone, requestOtp, verifyOtp } from "../services/otp.js";

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/api/auth/otp/request", async (request, reply) => {
    const body = request.body as { phone?: string };
    const phone = body.phone ? normalizePhone(body.phone) : null;
    if (!phone) {
      return reply.code(400).send({ error: "INVALID_PHONE" });
    }
    try {
      const result = await requestOtp(phone);
      return { ok: true, ...result };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      return reply.code(status).send({ error: (err as Error).message });
    }
  });

  app.post("/api/auth/otp/verify", async (request, reply) => {
    const body = request.body as { phone?: string; code?: string };
    const phone = body.phone ? normalizePhone(body.phone) : null;
    const code = body.code?.trim() ?? "";
    if (!phone || !/^\d{6}$/.test(code)) {
      return reply.code(400).send({ error: "INVALID_REQUEST" });
    }
    const ok = await verifyOtp(phone, code);
    if (!ok) {
      return reply.code(401).send({ error: "INVALID_OTP" });
    }

    const user = await prisma.user.upsert({
      where: { phone },
      create: {
        phone,
        phoneVerifiedAt: new Date(),
        roles: [UserRole.TRAINEE],
        locale: Locale.ru,
      },
      update: { phoneVerifiedAt: new Date() },
    });

    setSessionCookie(reply, signSession(user.id));
    return {
      user: {
        id: user.id,
        phone: user.phone,
        locale: user.locale,
        roles: user.roles,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return { ok: true };
  });

  app.get("/api/me", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    return { user };
  });

  app.patch("/api/me", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const body = request.body as {
      locale?: "ru" | "ky";
      firstName?: string;
      lastName?: string;
      email?: string;
    };
    const data: {
      locale?: Locale;
      firstName?: string;
      lastName?: string;
      email?: string | null;
    } = {};
    if (body.locale === "ru" || body.locale === "ky") data.locale = body.locale;
    if (typeof body.firstName === "string") data.firstName = body.firstName.slice(0, 80);
    if (typeof body.lastName === "string") data.lastName = body.lastName.slice(0, 80);
    if (typeof body.email === "string") data.email = body.email || null;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });
    request.authUser = {
      ...user,
      locale: updated.locale,
      firstName: updated.firstName,
      lastName: updated.lastName,
    };
    return {
      user: {
        id: updated.id,
        phone: updated.phone,
        locale: updated.locale,
        roles: updated.roles,
        firstName: updated.firstName,
        lastName: updated.lastName,
      },
    };
  });
}
