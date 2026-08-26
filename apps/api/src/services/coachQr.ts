import { createHmac, timingSafeEqual } from "node:crypto";
import { DateTime } from "luxon";
import { BISHKEK } from "../lib/prisma.js";

function qrSecret(): string {
  return process.env.COACH_QR_SECRET || process.env.JWT_SECRET || "dev-coach-qr-secret";
}

function todayKey(): string {
  return DateTime.now().setZone(BISHKEK).toFormat("yyyy-MM-dd");
}

function sign(coachId: string, day: string): string {
  return createHmac("sha256", qrSecret())
    .update(`${coachId}:${day}`)
    .digest("base64url")
    .slice(0, 22);
}

/** Ежедневный токен тренера (меняется в полночь по Бишкеку). */
export function issueCoachDayToken(coachId: string): {
  token: string;
  day: string;
  validUntil: string;
} {
  const day = todayKey();
  const token = `k1.${coachId}.${day}.${sign(coachId, day)}`;
  const validUntil = DateTime.now()
    .setZone(BISHKEK)
    .plus({ days: 1 })
    .startOf("day")
    .toISO()!;
  return { token, day, validUntil };
}

export function verifyCoachDayToken(token: string): { coachId: string; day: string } | null {
  const parts = token.trim().split(".");
  if (parts.length !== 4 || parts[0] !== "k1") return null;
  const [, coachId, day, sig] = parts;
  if (!coachId || !day || !sig) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  if (day !== todayKey()) return null;

  const expected = sign(coachId, day);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  return { coachId, day };
}

export function webOrigin(): string {
  return (process.env.WEB_ORIGIN ?? "http://localhost:5173").replace(/\/$/, "");
}
