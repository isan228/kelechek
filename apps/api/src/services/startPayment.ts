import { randomUUID } from "node:crypto";
import type { FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { applySuccessfulPayment } from "./paymentSuccess.js";
import { createFinikPaymentUrl, isFinikConfigured, isMockPayments } from "./finik.js";

export async function startTariffPayment(opts: {
  userId: string;
  tariffId: string;
  lang?: "ru" | "ky" | "en";
  reply: FastifyReply;
}): Promise<{ paymentId: string; status: string; paymentUrl: string | null } | null> {
  const tariff = await prisma.tariff.findFirst({
    where: { id: opts.tariffId, isActive: true },
    include: { translations: true },
  });
  if (!tariff) {
    void opts.reply.code(404).send({ error: "TARIFF_NOT_FOUND" });
    return null;
  }

  const name =
    tariff.translations.find((t) => t.locale === "ru")?.name ??
    tariff.translations[0]?.name ??
    "Kelechek";

  if (isMockPayments()) {
    const payment = await prisma.payment.create({
      data: {
        userId: opts.userId,
        tariffId: tariff.id,
        amountKgs: tariff.priceKgs,
        status: "PENDING",
        provider: "mock",
        idempotencyKey: randomUUID(),
      },
    });
    await applySuccessfulPayment(payment.id);
    const updated = await prisma.payment.findUnique({ where: { id: payment.id } });
    return {
      paymentId: payment.id,
      status: updated?.status ?? "SUCCEEDED",
      paymentUrl: null,
    };
  }

  if (!isFinikConfigured()) {
    void opts.reply.code(503).send({ error: "PAYMENTS_NOT_CONFIGURED" });
    return null;
  }

  const payment = await prisma.payment.create({
    data: {
      userId: opts.userId,
      tariffId: tariff.id,
      amountKgs: tariff.priceKgs,
      status: "PENDING",
      provider: "finik",
      idempotencyKey: randomUUID(),
    },
  });

  try {
    const paymentUrl = await createFinikPaymentUrl({
      paymentId: payment.id,
      amountKgs: tariff.priceKgs,
      description: name,
      lang: opts.lang ?? "ru",
    });
    return { paymentId: payment.id, status: "PENDING", paymentUrl };
  } catch (err) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED" },
    });
    throw err;
  }
}
