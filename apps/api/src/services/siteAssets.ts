import { DEFAULT_PHOTOS, SITE_PHOTO_KEYS } from "@kelech/shared";
import { prisma } from "../lib/prisma.js";

export async function getSitePhotosMap(): Promise<Record<string, string>> {
  const rows = await prisma.siteAsset.findMany({
    where: { key: { in: [...SITE_PHOTO_KEYS] } },
  });
  const map: Record<string, string> = { ...DEFAULT_PHOTOS };
  for (const row of rows) {
    if (row.url) map[row.key] = row.url;
  }
  return map;
}

export async function setSitePhotoUrl(key: string, url: string) {
  return prisma.siteAsset.upsert({
    where: { key },
    create: { key, url },
    update: { url },
  });
}
