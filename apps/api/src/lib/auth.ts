import jwt from "jsonwebtoken";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma, COOKIE_NAME } from "../lib/prisma.js";
import type { UserRole } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";

export type AuthUser = {
  id: string;
  phone: string;
  locale: "ru" | "ky";
  roles: UserRole[];
  status: "ACTIVE" | "BLOCKED";
  firstName: string | null;
  lastName: string | null;
};

declare module "fastify" {
  interface FastifyRequest {
    authUser: AuthUser | null;
  }
}

export function signSession(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function setSessionCookie(reply: FastifyReply, token: string) {
  reply.setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.COOKIE_SECURE === "true",
  });
}

export async function loadUserFromRequest(request: FastifyRequest): Promise<AuthUser | null> {
  const token = request.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== "ACTIVE" || user.deletedAt) return null;
    return {
      id: user.id,
      phone: user.phone,
      locale: user.locale,
      roles: user.roles,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  } catch {
    return null;
  }
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply): AuthUser | null {
  if (!request.authUser) {
    reply.code(401).send({ error: "UNAUTHORIZED" });
    return null;
  }
  return request.authUser;
}

export function requireRole(
  request: FastifyRequest,
  reply: FastifyReply,
  roles: UserRole[],
): AuthUser | null {
  const user = requireAuth(request, reply);
  if (!user) return null;
  if (!user.roles.some((r) => roles.includes(r))) {
    reply.code(403).send({ error: "FORBIDDEN" });
    return null;
  }
  return user;
}

export function hasRole(user: AuthUser, role: UserRole): boolean {
  return user.roles.includes(role);
}
