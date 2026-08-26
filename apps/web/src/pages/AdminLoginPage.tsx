import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

const ADMIN_LOGIN = "admin";
const ADMIN_PASSWORD = "kelechek2026";

export function AdminLoginPage() {
  const { t } = useTranslation();
  const { user, loading, setUser } = useAuth();
  const navigate = useNavigate();
  const [login, setLogin] = useState(ADMIN_LOGIN);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;
  if (user?.roles.includes("ADMIN")) return <Navigate to="/admin" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.adminLogin(login, password);
      setUser(res.user);
      navigate("/admin", { replace: true });
    } catch {
      setError(t("auth.badCredentials"));
    }
  }

  return (
    <div className="wrap section">
      <form className="card" style={{ maxWidth: 440, margin: "0 auto" }} onSubmit={(e) => void submit(e)}>
        <p className="kicker">{t("nav.admin")}</p>
        <h1>{t("auth.adminTitle")}</h1>
        <p className="muted">{t("auth.adminLead")}</p>
        <p className="ok">
          {t("auth.adminReady", { login: ADMIN_LOGIN, password: ADMIN_PASSWORD })}
        </p>
        <label>
          {t("auth.login")}
          <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        </label>
        <label>
          {t("auth.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <div className="row" style={{ marginTop: "1rem" }}>
          <button type="submit">{t("auth.submitLogin")}</button>
          <Link to="/">
            <button type="button" className="ghost">
              {t("auth.backHome")}
            </button>
          </Link>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  );
}
