import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const { t } = useTranslation();
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("+996");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setError(null);
    try {
      const res = await api.requestOtp(phone);
      setSent(true);
      setDevCode(res.devCode ?? null);
      if (res.devCode) setCode(res.devCode);
      if (!res.devCode) setError(t("auth.checkSms"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "OTP_RATE_LIMIT") setError(t("auth.rateLimit"));
      else if (msg === "INVALID_PHONE") setError(t("auth.invalidPhone"));
      else setError(t("errors.generic"));
    }
  }

  async function verify() {
    setError(null);
    try {
      const res = await api.verifyOtp(phone, code);
      setUser(res.user);
      navigate("/cabinet");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "INVALID_OTP") setError(t("auth.badCode"));
      else setError(t("errors.generic"));
    }
  }

  return (
    <div className="wrap section">
      <div className="card" style={{ maxWidth: 440 }}>
        <p className="kicker">{t("appName")}</p>
        <h1>{t("auth.title")}</h1>
        <p className="muted">{t("auth.lead")}</p>
        <label>
          {t("auth.phone")}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("auth.phonePlaceholder")} />
        </label>
        <div className="row" style={{ marginTop: "0.9rem" }}>
          <button type="button" onClick={() => void send()}>
            {t("auth.sendCode")}
          </button>
        </div>
        {devCode && <p className="ok">{t("auth.devCode", { code: devCode })}</p>}
        {sent && (
          <>
            <label>
              {t("auth.code")}
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" />
            </label>
            <div className="row" style={{ marginTop: "0.9rem" }}>
              <button type="button" onClick={() => void verify()}>
                {t("auth.verify")}
              </button>
            </div>
          </>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </div>
  );
}
