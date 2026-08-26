import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { photo } = useSiteCopy();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const nextPath = params.get("next");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("+996");
  const [firstName, setFirstName] = useState("");
  const [tariffId, setTariffId] = useState("");
  const [tariffs, setTariffs] = useState<Awaited<ReturnType<typeof api.tariffs>>["tariffs"]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";

  useEffect(() => {
    if (mode !== "register") return;
    void api.tariffs(locale).then((r) => {
      setTariffs(r.tariffs);
      if (r.tariffs[0] && !tariffId) setTariffId(r.tariffs[0].id);
    });
  }, [mode, locale]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        const res = await api.login(login, password);
        setUser(res.user);
        if (nextPath && nextPath.startsWith("/")) navigate(nextPath);
        else if (res.user.roles.includes("ADMIN")) navigate("/admin");
        else if (res.user.roles.includes("COACH")) navigate("/coach");
        else navigate("/cabinet");
        return;
      }
      if (!tariffId) {
        setError(t("auth.tariffRequired"));
        return;
      }
      const res = await api.register({ login, password, phone, firstName, tariffId });
      setUser(res.user);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
        return;
      }
      navigate("/cabinet");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "BAD_CREDENTIALS") setError(t("auth.badCredentials"));
      else if (msg === "INVALID_LOGIN") setError(t("auth.invalidLogin"));
      else if (msg === "INVALID_PASSWORD") setError(t("auth.invalidPassword"));
      else if (msg === "INVALID_PHONE") setError(t("auth.invalidPhone"));
      else if (msg === "LOGIN_TAKEN") setError(t("auth.loginTaken"));
      else if (msg === "PHONE_TAKEN") setError(t("auth.phoneTaken"));
      else if (msg === "TARIFF_REQUIRED") setError(t("auth.tariffRequired"));
      else if (msg === "PAYMENTS_NOT_CONFIGURED" || msg === "PAYMENT_PROVIDER_ERROR") {
        setError(t("auth.paymentError"));
      } else setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap section">
      <div className="split">
        <img className="login-photo" src={photo("city")} alt="" />
        <form className="card" style={{ maxWidth: 440 }} onSubmit={(e) => void submit(e)}>
          <p className="kicker">{t("appName")}</p>
          <h1>{mode === "login" ? t("auth.title") : t("auth.registerTitle")}</h1>
          <p className="muted">{mode === "register" ? t("auth.registerLead") : t("auth.lead")}</p>
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
              <label>
                {t("auth.tariff")}
                <select value={tariffId} onChange={(e) => setTariffId(e.target.value)} required>
                  {tariffs.length === 0 && <option value="">{t("admin.loading")}</option>}
                  {tariffs.map((tariff) => (
                    <option key={tariff.id} value={tariff.id}>
                      {tariff.name} — {tariff.priceKgs} сом
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                {t("auth.payNote")}
              </p>
            </>
          )}
          <div className="row" style={{ marginTop: "1rem" }}>
            <button type="submit" disabled={busy}>
              {busy
                ? t("pay.working")
                : mode === "login"
                  ? t("auth.submitLogin")
                  : t("auth.submitRegisterPay")}
            </button>
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
