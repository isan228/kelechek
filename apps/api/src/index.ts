import "./loadEnv.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { prisma } from "./lib/prisma.js";
import { loadUserFromRequest } from "./lib/auth.js";
import { ensureUploadsDir, UPLOADS_DIR } from "./lib/uploads.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerFinanceRoutes } from "./routes/finance.js";
import { registerContentRoutes, registerInvitationRoutes } from "./routes/content.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerFinikWebhook } from "./routes/finikWebhook.js";
import { registerScheduleRoutes } from "./routes/schedule.js";
import { registerCmsRoutes } from "./routes/cms.js";

ensureUploadsDir();

const app = Fastify({
  logger: true,
  trustProxy: process.env.NODE_ENV === "production",
});

await app.register(cookie);
await app.register(cors, {
  origin: true,
  credentials: true,
});
await app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024 },
});
await app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: "/api/media/",
  decorateReply: false,
});

app.addHook("onRequest", async (request) => {
  request.authUser = await loadUserFromRequest(request);
});

app.get("/api/health", async () => ({ ok: true }));

await registerAuthRoutes(app);
await registerFinanceRoutes(app);
await registerInvitationRoutes(app);
await registerContentRoutes(app);
await registerAdminRoutes(app);
await registerFinikWebhook(app);
await registerScheduleRoutes(app);
await registerCmsRoutes(app);

async function ensureIndexes() {
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS coaching_relation_one_active_trainee
    ON "CoachingRelation" ("traineeId") WHERE status = 'ACTIVE';
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS trainee_ledger_payment_type
    ON "TraineeLedgerEntry" ("paymentId", "type") WHERE "paymentId" IS NOT NULL;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS coach_ledger_payment_type
    ON "CoachLedgerEntry" ("paymentId", "type") WHERE "paymentId" IS NOT NULL;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS operator_ledger_payment_type
    ON "OperatorLedgerEntry" ("paymentId", "type") WHERE "paymentId" IS NOT NULL;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS one_open_withdrawal
    ON "WithdrawalApplication" ("userId")
    WHERE status IN ('SUBMITTED','IN_REVIEW','NEED_INFO','APPROVED','PAYOUT_IN_PROGRESS');
  `);
}

const port = Number(process.env.API_PORT ?? 3001);
const host =
  process.env.API_HOST ??
  (process.env.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0");

try {
  await ensureIndexes();
} catch (err) {
  app.log.warn({ err }, "index bootstrap skipped (database may not be ready)");
}

await app.listen({ port, host });
