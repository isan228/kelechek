import { useEffect, useState, type CSSProperties, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const { t, i18n } = useTranslation();
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
  const [showPass, setShowPass] = useState(false);
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
        else if (res.user.roles.includes("ACCOUNTANT")) navigate("/accounting");
        else if (res.user.roles.includes("COACH")) navigate("/coach");
        else navigate("/app");
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
      navigate("/app");
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

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError(null);
  }

  const features = t("homeLanding.features", { returnObjects: true }) as unknown as { t: string; d: string }[];

  return (
    <div className="au">
      <div className="au-blob au-blob-a" aria-hidden />
      <div className="au-blob au-blob-b" aria-hidden />
      <div className="au-grid">
        <aside className="au-promo">
          <span className="au-pill">{t("homeLanding.pill")}</span>
          <h2 className="au-promo-title">
            {t("homeLanding.titleA")}
            <span className="au-gt">{t("homeLanding.titleB")}</span>
            {t("homeLanding.titleC")}
          </h2>
          <div className="au-promo-rings" aria-hidden>
            <AuthRings />
          </div>
          <ul className="au-points">
            {features.slice(0, 3).map((f, i) => (
              <li key={f.t} style={{ "--c": TONES[i] } as CSSProperties}>
                <span className="au-point-ico">
                  <PointIcon i={i} />
                </span>
                <span>
                  <b>{f.t}</b>
                  <small>{f.d}</small>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <form className="au-card" onSubmit={(e) => void submit(e)} noValidate>
          <div className="au-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`au-tab ${mode === "login" ? "is-on" : ""}`}
              onClick={() => switchMode("login")}
            >
              {t("auth.title")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`au-tab ${mode === "register" ? "is-on" : ""}`}
              onClick={() => switchMode("register")}
            >
              {t("auth.registerTitle")}
            </button>
          </div>

          <h1 className="au-title">{mode === "login" ? t("auth.title") : t("auth.registerTitle")}</h1>
          <p className="au-lead">{mode === "register" ? t("auth.registerLead") : t("auth.lead")}</p>

          <div className="au-fields">
            <label className="au-field">
              <span>{t("auth.login")}</span>
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder={t("auth.loginPlaceholder")}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>
            <label className="au-field">
              <span>{t("auth.password")}</span>
              <span className="au-pass">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="au-eye"
                  aria-label={showPass ? t("auth.hidePassword") : t("auth.showPassword")}
                  aria-pressed={showPass}
                  onClick={() => setShowPass((v) => !v)}
                >
                  <EyeIcon off={showPass} />
                </button>
              </span>
            </label>

            {mode === "register" && (
              <>
                <div className="au-row">
                  <label className="au-field">
                    <span>{t("auth.phone")}</span>
                    <input
                      type="tel"
                      inputMode="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t("auth.phonePlaceholder")}
                      autoComplete="tel"
                    />
                  </label>
                  <label className="au-field">
                    <span>{t("profile.firstName")}</span>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                  </label>
                </div>

                <fieldset className="au-tariffs">
                  <legend>{t("auth.tariff")}</legend>
                  {tariffs.length === 0 && <p className="au-muted">{t("admin.loading")}</p>}
                  {tariffs.map((tariff) => (
                    <label key={tariff.id} className={`au-tariff ${tariffId === tariff.id ? "is-on" : ""}`}>
                      <input
                        type="radio"
                        name="tariff"
                        value={tariff.id}
                        checked={tariffId === tariff.id}
                        onChange={() => setTariffId(tariff.id)}
                      />
                      <span className="au-tariff-main">
                        <b>{tariff.name}</b>
                        {tariff.description && <small>{tariff.description}</small>}
                      </span>
                      <span className="au-tariff-price">
                        {tariff.priceKgs.toLocaleString("ru-RU")} <small>сом</small>
                      </span>
                    </label>
                  ))}
                </fieldset>
                <p className="au-note">{t("auth.payNote")}</p>
              </>
            )}
          </div>

          {error && (
            <p className="au-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="au-submit" disabled={busy}>
            {busy ? t("pay.working") : mode === "login" ? t("auth.submitLogin") : t("auth.submitRegisterPay")}
          </button>

          <div className="au-foot">
            <Link to="/">{t("auth.backHome")}</Link>
            <Link to="/admin/login">{t("auth.adminLink")}</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const TONES = ["#3ddc97", "#6f9bff", "#ffb84d", "#ff6fae"];

function AuthRings() {
  const values = [100, 68, 30, 0];
  return (
    <svg viewBox="0 0 220 220" width="100%" height="100%">
      {values.map((pct, i) => {
        const r = 100 - i * 22;
        const len = 2 * Math.PI * r;
        return (
          <g key={i}>
            <circle cx="110" cy="110" r={r} fill="none" stroke="#262d3b" strokeWidth="14" />
            {pct > 0 && (
              <circle
                cx="110"
                cy="110"
                r={r}
                fill="none"
                stroke={TONES[i]}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${(len * pct) / 100} ${len}`}
                transform="rotate(-90 110 110)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PointIcon({ i }: { i: number }) {
  const p = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (i === 0)
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <path d="M12 3v4" />
      </svg>
    );
  if (i === 1)
    return (
      <svg {...p}>
        <circle cx="12" cy="7.5" r="3.5" />
        <path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="M4 4l16 16" />}
    </svg>
  );
}
