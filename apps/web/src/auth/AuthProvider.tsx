import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, type ApiUser } from "../api/client";
import i18n from "../i18n";

type AuthState = {
  user: ApiUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: ApiUser | null) => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const data = await api.me();
      setUser(data.user);
      await i18n.changeLanguage(data.user.locale);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const value = useMemo(() => ({ user, loading, refresh, setUser }), [user, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
