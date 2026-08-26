import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

export function LoginPage() {
  const { t } = useTranslation();
  const { photo } = useSiteCopy();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+996");
  const [firstName, setFirstName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res =
        mode === "login"
          ? await api.login(login, password)
          : await api.register({ login, password, phone, firstName });
      setUser(res.user);
      navigate(res.user.roles.includes("ADMIN") ? "/admin" : "/cabinet");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "BAD_CREDENTIALS") setError(t("auth.badCredentials"));
      else if (msg === "INVALID_LOGIN") setError(t("auth.invalidLogin"));
      else if (msg === "INVALID_PASSWORD") setError(t("auth.invalidPassword"));
      else if (msg === "INVALID_PHONE") setError(t("auth.invalidPhone"));
      else if (msg === "LOGIN_TAKEN") setError(t("auth.loginTaken"));
      else if (msg === "PHONE_TAKEN") setError(t("auth.phoneTaken"));
      else setError(t("errors.generic"));
    }
  }

  return (
    <div className="wrap section">
      <div className="split">
        <img className="login-photo" src={photo("city")} alt="" />
        <form className="card" style={{ maxWidth: 440 }} onSubmit={(e) => void submit(e)}>
          <p className="kicker">{t("appName")}</p>
          <h1>{mode === "login" ? t("auth.title") : t("auth.registerTitle")}</h1>
          <p className="muted">{t("auth.lead")}</p>
          <div className="row" style={{ marginTop: "0.6rem" }}>
            <button
              type="button"
              className={mode === "login" ? "" : "ghost"}
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              {t("auth.title")}
            </button>
            <button
              type="button"
              className={mode === "register" ? "" : "ghost"}
              onClick={() => {
                setMode("register");
                setError(null);
              }}
            >
              {t("auth.registerTitle")}
            </button>
          </div>
          <label>
            {t("auth.login")}
            <input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder={t("auth.loginPlaceholder")}
              autoComplete="username"
            />
          </label>
          <label>
            {t("auth.password")}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </label>
          {mode === "register" && (
            <>
              <label>
                {t("auth.phone")}
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("auth.phonePlaceholder")}
                />
              </label>
              <label>
                {t("profile.firstName")}
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </label>
            </>
          )}
          <div className="row" style={{ marginTop: "1rem" }}>
            <button type="submit">{mode === "login" ? t("auth.submitLogin") : t("auth.submitRegister")}</button>
          </div>
          {error && <p className="error">{error}</p>}
          <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
            <Link to="/admin/login">{t("auth.adminLink")}</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
