import crypto from "node:crypto";
import { prisma } from "../lib/prisma.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function hashCode(phone: string, code: string): string {
  return crypto.createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function randomOtp(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function normalizePhone(input: string): string | null {
  const d = input.replace(/\D/g, "");
  if (d.startsWith("996") && d.length === 12) return `+${d}`;
  if (d.startsWith("0") && d.length === 10) return `+996${d.slice(1)}`;
  if (d.length === 9) return `+996${d}`;
  return null;
}

function shouldEchoOtp(): boolean {
  if (process.env.OTP_DEV_ECHO === "true") return true;
  if (process.env.OTP_DEV_ECHO === "false" && process.env.SMS_PROVIDER) return false;
  return !process.env.SMS_PROVIDER;
}

export async function requestOtp(phone: string): Promise<{ devCode?: string }> {
  const since = new Date(Date.now() - WINDOW_MS);
  const recent = await prisma.otpChallenge.count({
    where: { phone, createdAt: { gte: since } },
  });
  if (recent >= MAX_ATTEMPTS) {
    throw Object.assign(new Error("OTP_RATE_LIMIT"), { statusCode: 429 });
  }

  const code = randomOtp();
  await prisma.otpChallenge.create({
    data: {
      phone,
      codeHash: hashCode(phone, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  console.log(`[otp] ${phone} → ${code}`);
  if (shouldEchoOtp()) {
    return { devCode: code };
  }
  return {};
}

export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return false;
  if (challenge.expiresAt < new Date()) return false;
  if (challenge.attempts >= MAX_ATTEMPTS) return false;

  const ok = challenge.codeHash === hashCode(phone, code);
  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: {
      attempts: { increment: 1 },
      consumedAt: ok ? new Date() : undefined,
    },
  });
  return ok;
}
