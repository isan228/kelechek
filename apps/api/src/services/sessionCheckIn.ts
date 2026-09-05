import { createHmac, timingSafeEqual } from "node:crypto";
import { webOrigin } from "./coachQr.js";

function secret(): string {
  return process.env.COACH_QR_SECRET || process.env.JWT_SECRET || "dev-coach-qr-secret";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url").slice(0, 24);
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

/** QR отметки на конкретную тренировку. */
export function issueSessionCheckInToken(sessionId: string, endsAt: Date): {
  token: string;
  joinUrl: string;
} {
  const exp = Math.floor(endsAt.getTime() / 1000) + 30 * 60; // +30 мин после конца
  const payload = Buffer.from(JSON.stringify({ s: sessionId, e: exp }), "utf8").toString("base64url");
  const token = `a1.${payload}.${sign(payload)}`;
  return {
    token,
    joinUrl: `${webOrigin()}/checkin?t=${encodeURIComponent(token)}`,
  };
}

export function verifySessionCheckInToken(token: string): { sessionId: string } | null {
  const raw = token.trim();
  if (!raw.startsWith("a1.")) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [, payload, sig] = parts;
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      s?: string;
      e?: number;
    };
    if (!data.s || !data.e) return null;
    if (Math.floor(Date.now() / 1000) > data.e) return null;
    return { sessionId: data.s };
  } catch {
    return null;
  }
}

export function extractCheckInToken(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  try {
    if (text.includes("t=") || /^https?:\/\//i.test(text) || text.includes("/checkin")) {
      const u = new URL(text.includes("://") ? text : `https://x.local${text.startsWith("/") ? text : `/${text}`}`);
      const t = u.searchParams.get("t");
      if (t) return t.trim();
    }
  } catch {
    /* plain */
  }
  return text;
}
