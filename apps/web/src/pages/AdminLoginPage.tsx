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
    <div className="au">
      <div className="au-blob au-blob-a" aria-hidden />
      <div className="au-blob au-blob-b" aria-hidden />
      <div className="au-grid au-grid-solo">
        <form className="au-card" onSubmit={(e) => void submit(e)}>
          <span className="au-pill">{t("nav.admin")}</span>
          <h1 className="au-title">{t("auth.adminTitle")}</h1>
          <p className="au-lead">{t("auth.adminLead")}</p>
          <p className="au-hint">{t("auth.adminReady", { login: ADMIN_LOGIN, password: ADMIN_PASSWORD })}</p>
          <div className="au-fields">
            <label className="au-field">
              <span>{t("auth.login")}</span>
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
              />
            </label>
            <label className="au-field">
              <span>{t("auth.password")}</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
          </div>
          {error && (
            <p className="au-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="au-submit">
            {t("auth.submitLogin")}
          </button>
          <div className="au-foot">
            <Link to="/">{t("auth.backHome")}</Link>
            <Link to="/login">{t("auth.title")}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
