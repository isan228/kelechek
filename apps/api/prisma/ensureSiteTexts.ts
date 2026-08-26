import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Locale, type PrismaClient } from "@prisma/client";
import { SITE_TEXT_KEYS } from "@kelech/shared";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadLocale(code: "ru" | "ky"): Record<string, unknown> {
  const raw = readFileSync(join(ROOT, `apps/web/src/locales/${code}/common.json`), "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

function pick(obj: Record<string, unknown>, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return "";
    }
  }
  return typeof cur === "string" ? cur : "";
}

const EXTRA: Record<string, { ru: string; ky: string }> = {
  "landing.statValue1": { ru: "82%", ky: "82%" },
  "landing.statValue2": { ru: "30", ky: "30" },
  "landing.statValue3": { ru: "12", ky: "12" },
};

export async function ensureSiteTexts(prisma: PrismaClient) {
  const ru = loadLocale("ru");
  const ky = loadLocale("ky");
  for (const key of SITE_TEXT_KEYS) {
    const ruVal = EXTRA[key]?.ru ?? (key.includes(".") ? pick(ru, key) : String(ru[key] ?? ""));
    const kyVal = EXTRA[key]?.ky ?? (key.includes(".") ? pick(ky, key) : String(ky[key] ?? ""));
    if (ruVal) {
      await prisma.siteText.upsert({
        where: { key_locale: { key, locale: Locale.ru } },
        create: { key, locale: Locale.ru, value: ruVal },
        update: {},
      });
    }
    if (kyVal) {
      await prisma.siteText.upsert({
        where: { key_locale: { key, locale: Locale.ky } },
        create: { key, locale: Locale.ky, value: kyVal },
        update: {},
      });
    }
  }
}
