import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { hasRole, requireAuth, requireRole } from "../lib/auth.js";

const MESSAGE_MAX = 2000;

function cleanBody(v: unknown): string {
  return String(v ?? "").trim().slice(0, MESSAGE_MAX);
}

function mapMessage(m: {
  id: string;
  body: string;
  createdAt: Date;
  senderId: string;
  sender: { id: string; firstName: string | null; lastName: string | null; roles: string[] };
}) {
  const isAdmin = m.sender.roles.includes("ADMIN");
  const name =
    [m.sender.firstName, m.sender.lastName].filter(Boolean).join(" ").trim() ||
    (isAdmin ? "Админ" : "Пользователь");
  return {
    id: m.id,
    body: m.body,
    createdAt: m.createdAt,
    senderId: m.senderId,
    isAdmin,
    senderName: name,
  };
}

async function getOrCreateUserThread(userId: string) {
  return prisma.chatThread.upsert({
    where: { userId },
    create: { userId, userLastReadAt: new Date() },
    update: {},
  });
}

export async function registerChatRoutes(app: FastifyInstance) {
  app.get("/api/chat/unread", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;

    if (hasRole(user, "ADMIN")) {
      const threads = await prisma.chatThread.findMany({
        select: {
          id: true,
          adminLastReadAt: true,
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true, senderId: true },
          },
        },
      });
      let unread = 0;
      for (const t of threads) {
        const last = t.messages[0];
        if (!last) continue;
        if (last.senderId === user.id) continue;
        if (!t.adminLastReadAt || last.createdAt > t.adminLastReadAt) unread += 1;
      }
      return { unread };
    }

    const thread = await prisma.chatThread.findUnique({ where: { userId: user.id } });
    if (!thread) return { unread: 0 };
    const count = await prisma.chatMessage.count({
      where: {
        threadId: thread.id,
        senderId: { not: user.id },
        ...(thread.userLastReadAt ? { createdAt: { gt: thread.userLastReadAt } } : {}),
      },
    });
    return { unread: count };
  });

  app.get("/api/chat/thread", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    if (hasRole(user, "ADMIN") && !hasRole(user, "TRAINEE") && !hasRole(user, "COACH")) {
      return reply.code(400).send({ error: "USE_ADMIN_INBOX" });
    }

    const thread = await getOrCreateUserThread(user.id);
    const messages = await prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { sender: { select: { id: true, firstName: true, lastName: true, roles: true } } },
    });

    await prisma.chatThread.update({
      where: { id: thread.id },
      data: { userLastReadAt: new Date() },
    });

    return {
      thread: { id: thread.id, status: thread.status, updatedAt: thread.updatedAt },
      messages: messages.map(mapMessage),
    };
  });

  app.post("/api/chat/messages", async (request, reply) => {
    const user = requireAuth(request, reply);
    if (!user) return;
    const body = cleanBody((request.body as { body?: string } | null)?.body);
    if (!body) return reply.code(400).send({ error: "EMPTY_MESSAGE" });

    const thread = await getOrCreateUserThread(user.id);
    if (thread.status === "CLOSED") {
      await prisma.chatThread.update({
        where: { id: thread.id },
        data: { status: "OPEN" },
      });
    }

    const message = await prisma.chatMessage.create({
      data: { threadId: thread.id, senderId: user.id, body },
      include: { sender: { select: { id: true, firstName: true, lastName: true, roles: true } } },
    });
    await prisma.chatThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date(), userLastReadAt: new Date() },
    });

    return { message: mapMessage(message) };
  });

  app.get("/api/chat/admin/threads", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;

    const threads = await prisma.chatThread.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, login: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { sender: { select: { id: true, firstName: true, lastName: true, roles: true } } },
        },
      },
    });

    return {
      threads: threads.map((t) => {
        const last = t.messages[0] ?? null;
        const unread =
          Boolean(last) &&
          last!.senderId !== admin.id &&
          (!t.adminLastReadAt || last!.createdAt > t.adminLastReadAt);
        const name =
          [t.user.firstName, t.user.lastName].filter(Boolean).join(" ").trim() ||
          t.user.login ||
          t.user.phone;
        return {
          id: t.id,
          status: t.status,
          updatedAt: t.updatedAt,
          userName: name,
          userPhone: t.user.phone,
          unread,
          lastMessage: last
            ? {
                body: last.body,
                createdAt: last.createdAt,
                isAdmin: last.sender.roles.includes("ADMIN"),
              }
            : null,
        };
      }),
    };
  });

  app.get("/api/chat/admin/threads/:id", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const { id } = request.params as { id: string };

    const thread = await prisma.chatThread.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, phone: true, login: true } },
      },
    });
    if (!thread) return reply.code(404).send({ error: "NOT_FOUND" });

    const messages = await prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { sender: { select: { id: true, firstName: true, lastName: true, roles: true } } },
    });

    await prisma.chatThread.update({
      where: { id: thread.id },
      data: { adminLastReadAt: new Date() },
    });

    const name =
      [thread.user.firstName, thread.user.lastName].filter(Boolean).join(" ").trim() ||
      thread.user.login ||
      thread.user.phone;

    return {
      thread: {
        id: thread.id,
        status: thread.status,
        updatedAt: thread.updatedAt,
        userName: name,
        userPhone: thread.user.phone,
      },
      messages: messages.map(mapMessage),
    };
  });

  app.post("/api/chat/admin/threads/:id/messages", async (request, reply) => {
    const admin = requireRole(request, reply, ["ADMIN"]);
    if (!admin) return;
    const { id } = request.params as { id: string };
    const body = cleanBody((request.body as { body?: string } | null)?.body);
    if (!body) return reply.code(400).send({ error: "EMPTY_MESSAGE" });

    const thread = await prisma.chatThread.findUnique({ where: { id } });
    if (!thread) return reply.code(404).send({ error: "NOT_FOUND" });

    const message = await prisma.chatMessage.create({
      data: { threadId: thread.id, senderId: admin.id, body },
      include: { sender: { select: { id: true, firstName: true, lastName: true, roles: true } } },
    });
    await prisma.chatThread.update({
      where: { id: thread.id },
      data: {
        updatedAt: new Date(),
        adminLastReadAt: new Date(),
        status: "OPEN",
      },
    });

    return { message: mapMessage(message) };
  });
}
