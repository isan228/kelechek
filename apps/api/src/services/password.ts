import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), derived);
  } catch {
    return false;
  }
}

export function normalizeLogin(input: string): string | null {
  const login = input.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,32}$/.test(login)) return null;
  return login;
}

export function validatePassword(password: string): boolean {
  return password.length >= 6 && password.length <= 128;
}
