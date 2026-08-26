import { Locale } from "@prisma/client";
import { SITE_TEXT_KEYS } from "@kelech/shared";
import { prisma } from "../lib/prisma.js";

export async function getSiteTextsMap(locale: Locale): Promise<Record<string, string>> {
  const rows = await prisma.siteText.findMany({
    where: { locale: { in: [locale, Locale.ru] } },
  });
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (row.locale === Locale.ru) map[row.key] = row.value;
  }
  for (const row of rows) {
    if (row.locale === locale) map[row.key] = row.value;
  }
  return map;
}

export async function upsertSiteTexts(
  items: { key: string; locale: Locale; value: string }[],
): Promise<number> {
  let n = 0;
  for (const item of items) {
    if (!SITE_TEXT_KEYS.includes(item.key)) continue;
    await prisma.siteText.upsert({
      where: { key_locale: { key: item.key, locale: item.locale } },
      create: { key: item.key, locale: item.locale, value: item.value },
      update: { value: item.value },
    });
    n += 1;
  }
  return n;
}
