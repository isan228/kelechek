import type { FastifyInstance } from "fastify";
import { Locale, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { requireAuth, setSessionCookie, clearSessionCookie, signSession } from "../lib/auth.js";
import { normalizePhone } from "../services/otp.js";
import {
  hashPassword,
  normalizeLogin,
  validatePassword,
  verifyPassword,
} from "../services/password.js";
import { startTariffPayment } from "../services/startPayment.js";
import { isMockPayments } from "../services/finik.js";

function publicUser(user: {
  id: string;
  phone: string;
  locale: Locale;
  roles: UserRole[];
  firstName: string | null;
  lastName: string | null;
  login?: string | null;
}) {
  return {
    id: user.id,
    phone: user.phone,
    login: user.login ?? null,
    locale: user.locale,
    roles: user.roles,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (request, reply) => {
    const body = request.body as {
      login?: string;
      password?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      tariffId?: string;
    };
    const login = body.login ? normalizeLogin(body.login) : null;
    const password = body.password ?? "";
    const phone = body.phone ? normalizePhone(body.phone) : null;
    if (!login) return reply.code(400).send({ error: "INVALID_LOGIN" });
    if (!validatePassword(password)) return reply.code(400).send({ error: "INVALID_PASSWORD" });
    if (!phone) return reply.code(400).send({ error: "INVALID_PHONE" });

    let tariffId = (body.tariffId ?? "").trim();
    if (!tariffId) {
      if (isMockPayments()) {
        const first = await prisma.tariff.findFirst({
          where: { isActive: true },
          orderBy: { priceKgs: "asc" },
        });
        if (!first) return reply.code(400).send({ error: "TARIFF_REQUIRED" });
        tariffId = first.id;
      } else {
        return reply.code(400).send({ error: "TARIFF_REQUIRED" });
      }
    }

    const taken = await prisma.user.findFirst({
      where: { OR: [{ login }, { phone }] },
    });
    if (taken?.login === login) return reply.code(409).send({ error: "LOGIN_TAKEN" });
    if (taken?.phone === phone) return reply.code(409).send({ error: "PHONE_TAKEN" });

    const user = await prisma.user.create({
      data: {
        login,
        phone,
        passwordHash: await hashPassword(password),
        phoneVerifiedAt: new Date(),
        firstName: (body.firstName ?? "").trim().slice(0, 80) || null,
        lastName: (body.lastName ?? "").trim().slice(0, 80) || null,
        roles: [UserRole.TRAINEE],
        locale: Locale.ru,
      },
    });

    setSessionCookie(reply, signSession(user.id));

    try {
      const pay = await startTariffPayment({
        userId: user.id,
        tariffId,
        lang: "ru",
        reply,
      });
      if (!pay) return;
      return {
        user: publicUser(user),
        payment: { id: pay.paymentId, status: pay.status },
        paymentUrl: pay.paymentUrl,
      };
    } catch (err) {
      request.log.error({ err, userId: user.id }, "register payment failed");
      return reply.code(502).send({
        error: "PAYMENT_PROVIDER_ERROR",
        user: publicUser(user),
      });
    }
  });

  app.post("/api/auth/login", async (request, reply) => {
    const body = request.body as { login?: string; password?: string };
    const login = body.login ? normalizeLogin(body.login) : null;
    const password = body.password ?? "";
    if (!login || !password) return reply.code(400).send({ error: "INVALID_REQUEST" });

    const user = await prisma.user.findFirst({
      where: { login, deletedAt: null },
    });
    if (!user?.passwordHash || user.status !== "ACTIVE") {
      return reply.code(401).send({ error: "BAD_CREDENTIALS" });
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "BAD_CREDENTIALS" });

    setSessionCookie(reply, signSession(user.id));
    return { user: publicUser(user) };
  });

  app.post("/api/auth/admin/login", async (request, reply) => {
    const body = request.body as { login?: string; password?: string };
    const expectedLogin = (process.env.ADMIN_LOGIN ?? "admin").trim().toLowerCase();
    const expectedPassword = process.env.ADMIN_PASSWORD ?? "kelechek2026";
    const login = (body.login ?? "").trim().toLowerCase();
    const password = body.password ?? "";

    if (login !== expectedLogin || password !== expectedPassword) {
      return reply.code(401).send({ error: "BAD_CREDENTIALS" });
    }

    let admin = await prisma.user.findFirst({
      where: { roles: { has: UserRole.ADMIN }, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          phone: "+996700000000",
          login: expectedLogin,
          passwordHash: await hashPassword(expectedPassword),
          roles: [UserRole.ADMIN, UserRole.CONTENT_EDITOR],
          firstName: "Админ",
          locale: Locale.ru,
          phoneVerifiedAt: new Date(),
        },
      });
    } else {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: {
          login: expectedLogin,
          passwordHash: await hashPassword(expectedPassword),
          roles: admin.roles.includes(UserRole.ADMIN)
            ? admin.roles
            : [...admin.roles, UserRole.ADMIN],
          status: "ACTIVE",
          deletedAt: null,
        },
      });
    }

    setSessionCookie(reply, signSession(admin.id));
    return { user: publicUser(admin) };
  });

  app.post("/api/auth/logout", async (_request, reply) => {
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/api/auth/logout", async (_request, reply) => {
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.get("/api/me", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const full = await prisma.user.findUnique({ where: { id: user.id } });
    return { user: publicUser({ ...user, login: full?.login ?? null }) };
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
    return { user: publicUser(updated) };
  });
}
