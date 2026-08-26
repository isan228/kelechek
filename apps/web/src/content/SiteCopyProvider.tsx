import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";

type SiteCopyCtx = {
  ready: boolean;
  s: (key: string) => string;
  texts: Record<string, string>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<SiteCopyCtx | null>(null);

export function SiteCopyProvider({ children }: { children: ReactNode }) {
  const { i18n, t } = useTranslation();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  async function refresh() {
    try {
      const res = await api.siteTexts(locale);
      setTexts(res.texts);
    } catch {
      setTexts({});
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
      refresh,
      s: (key: string) => texts[key] || t(key),
    }),
    [ready, texts, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSiteCopy() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("SiteCopyProvider missing");
  return ctx;
}
