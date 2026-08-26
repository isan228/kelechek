import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const UPLOADS_DIR = resolve(HERE, "../../../uploads");

export function ensureUploadsDir() {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}
