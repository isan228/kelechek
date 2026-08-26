import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { DEFAULT_PHOTOS } from "@kelech/shared";
import { api } from "../api/client";

type SiteCopyCtx = {
  ready: boolean;
  s: (key: string) => string;
  texts: Record<string, string>;
  photos: Record<string, string>;
  photo: (key: string) => string;
  refresh: () => Promise<void>;
};

const Ctx = createContext<SiteCopyCtx | null>(null);

export function SiteCopyProvider({ children }: { children: ReactNode }) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Record<string, string>>({ ...DEFAULT_PHOTOS });
  const [ready, setReady] = useState(false);

  async function refresh() {
    try {
      const [textRes, photoRes] = await Promise.all([api.siteTexts(locale), api.sitePhotos()]);
      setTexts(textRes.texts);
      setPhotos({ ...DEFAULT_PHOTOS, ...photoRes.photos });
    } catch {
      setTexts({});
      setPhotos({ ...DEFAULT_PHOTOS });
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    setReady(false);
    void refresh();
  }, [locale]);

  const value = useMemo<SiteCopyCtx>(
    () => ({
      ready,
      texts,
      photos,
      refresh,
      s: (key: string) => texts[key] || t(key),
      photo: (key: string) => photos[key] || DEFAULT_PHOTOS[key] || "",
    }),
    [ready, texts, photos, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSiteCopy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("SiteCopyProvider missing");
  return ctx;
}
