import { createHmac, timingSafeEqual } from "node:crypto";
import { DateTime } from "luxon";
import { BISHKEK } from "../lib/prisma.js";

function qrSecret(): string {
  return process.env.COACH_QR_SECRET || process.env.JWT_SECRET || "dev-coach-qr-secret";
}

function todayKey(): string {
  return DateTime.now().setZone(BISHKEK).toFormat("yyyy-MM-dd");
}

function signPayload(payload: string): string {
  return createHmac("sha256", qrSecret()).update(payload).digest("base64url").slice(0, 24);
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Ежедневный токен тренера (меняется в полночь по Бишкеку). */
export function issueCoachDayToken(coachId: string): {
  token: string;
  day: string;
  validUntil: string;
} {
  const day = todayKey();
  // Один base64-блок — без точек внутри, чтобы UUID/дата не ломали разбор.
  const payload = Buffer.from(JSON.stringify({ c: coachId, d: day }), "utf8").toString("base64url");
  const token = `k2.${payload}.${signPayload(payload)}`;
  const validUntil = DateTime.now()
    .setZone(BISHKEK)
    .plus({ days: 1 })
    .startOf("day")
    .toISO()!;
  return { token, day, validUntil };
}

export function verifyCoachDayToken(token: string): { coachId: string; day: string } | null {
  const raw = token.trim();
  // Новый формат k2.<payload>.<sig>
  if (raw.startsWith("k2.")) {
    const parts = raw.split(".");
    if (parts.length !== 3) return null;
    const [, payload, sig] = parts;
    if (!payload || !sig || !safeEqual(sig, signPayload(payload))) return null;
    try {
      const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
        c?: string;
        d?: string;
      };
      if (!data.c || !data.d) return null;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.d)) return null;
      if (data.d !== todayKey()) return null;
      return { coachId: data.c, day: data.d };
    } catch {
      return null;
    }
  }

  // Старый формат k1.<uuid>.<day>.<sig> — на один день совместимости
  const parts = raw.split(".");
  if (parts.length !== 4 || parts[0] !== "k1") return null;
  const [, coachId, day, sig] = parts;
  if (!coachId || !day || !sig) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  if (day !== todayKey()) return null;
  const expected = createHmac("sha256", qrSecret())
    .update(`${coachId}:${day}`)
    .digest("base64url")
    .slice(0, 22);
  if (!safeEqual(sig, expected)) return null;
  return { coachId, day };
}

export function webOrigin(): string {
  return (process.env.WEB_ORIGIN ?? "http://localhost:5173").replace(/\/$/, "");
}

/** Достаёт токен из сырой строки (URL или сам токен). */
export function extractCoachToken(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  try {
    if (text.includes("t=") || /^https?:\/\//i.test(text) || text.startsWith("/join")) {
      const u = new URL(text, webOrigin());
      const t = u.searchParams.get("t");
      if (t) return t.trim();
    }
  } catch {
    /* plain token */
  }
  // Иногда камера возвращает URL без схемы
  if (text.includes("/join?") && text.includes("t=")) {
    try {
      const u = new URL(text.includes("://") ? text : `https://dummy.local${text.startsWith("/") ? "" : "/"}${text}`);
      const t = u.searchParams.get("t");
      if (t) return t.trim();
    } catch {
      /* fallthrough */
    }
  }
  return text;
}
