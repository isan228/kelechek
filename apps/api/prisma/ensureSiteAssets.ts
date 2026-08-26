import type { PrismaClient } from "@prisma/client";
import { DEFAULT_PHOTOS, SITE_PHOTO_KEYS } from "@kelech/shared";

export async function ensureSiteAssets(prisma: PrismaClient) {
  for (const key of SITE_PHOTO_KEYS) {
    await prisma.siteAsset.upsert({
      where: { key },
      create: { key, url: DEFAULT_PHOTOS[key] ?? "" },
      update: {},
    });
  }
}
