import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { applySuccessfulPayment } from "../services/paymentSuccess.js";
import {
  isFinikSuccessStatus,
  type FinikWebhookBody,
  verifyFinikWebhook,
} from "../services/finik.js";

export async function registerFinikWebhook(app: FastifyInstance) {
  app.post("/api/webhooks/finik", async (request, reply) => {
    const signature =
      (request.headers.signature as string | undefined) ||
      (request.headers["x-signature"] as string | undefined);
    if (!signature) {
      return reply.code(401).send({ error: "NO_SIGNATURE" });
    }

    const host =
      process.env.FINIK_WEBHOOK_HOST ||
      (typeof request.headers.host === "string" ? request.headers.host.split(":")[0] : "") ||
      new URL(process.env.WEB_ORIGIN ?? "http://localhost").host;

    const path = "/api/webhooks/finik";
    let valid = false;
    try {
      valid = await verifyFinikWebhook({
        body: request.body,
        path,
        host,
        headers: request.headers as Record<string, string | string[] | undefined>,
        signature,
      });
    } catch (err) {
      request.log.error({ err }, "finik webhook verify error");
      return reply.code(401).send({ error: "BAD_SIGNATURE" });
    }

    if (!valid) {
      request.log.warn("finik webhook invalid signature");
      return reply.code(401).send({ error: "BAD_SIGNATURE" });
    }

    const body = request.body as FinikWebhookBody;
    if (!isFinikSuccessStatus(body.status)) {
      return reply.code(200).send({ ok: true, ignored: true });
    }

    const paymentId = body.fields?.paymentId;
    if (!paymentId || typeof paymentId !== "string") {
      return reply.code(400).send({ error: "NO_PAYMENT_ID" });
    }

    const eventId = body.transactionId || body.id;
    if (!eventId) {
      return reply.code(400).send({ error: "NO_TRANSACTION_ID" });
    }

    const existing = await prisma.processedWebhook.findUnique({
      where: {
        provider_providerEventId: { provider: "finik", providerEventId: eventId },
      },
    });
    if (existing) {
      return reply.code(200).send({ ok: true, duplicate: true });
    }

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      request.log.warn({ paymentId }, "finik webhook unknown payment");
      return reply.code(404).send({ error: "PAYMENT_NOT_FOUND" });
    }

    if (typeof body.amount === "number" && body.amount > 0 && body.amount !== payment.amountKgs) {
      request.log.warn(
        { paymentId, expected: payment.amountKgs, got: body.amount },
        "finik amount mismatch",
      );
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        provider: "finik",
        providerPaymentId: eventId.slice(0, 120),
      },
    });

    try {
      await applySuccessfulPayment(payment.id);
    } catch (err) {
      request.log.error({ err, paymentId }, "finik apply payment failed");
      return reply.code(500).send({ error: "APPLY_FAILED" });
    }

    await prisma.processedWebhook.upsert({
      where: {
        provider_providerEventId: { provider: "finik", providerEventId: eventId },
      },
      create: {
        provider: "finik",
        providerEventId: eventId,
        paymentId: payment.id,
      },
      update: {},
    });

    return reply.code(200).send({ ok: true });
  });
}
