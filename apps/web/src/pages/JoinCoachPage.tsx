import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

function extractToken(raw: string): string {
  const text = raw.trim();
  try {
    if (text.includes("t=") || text.startsWith("http")) {
      const u = new URL(text, window.location.origin);
      return u.searchParams.get("t") || text;
    }
  } catch {
    /* plain */
  }
  return text;
}

export function JoinCoachPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(params.get("t") ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [needReplace, setNeedReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const boxId = "coach-qr-reader";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const tkn = params.get("t");
      navigate(tkn ? `/login?next=${encodeURIComponent(`/join?t=${tkn}`)}` : "/login", { replace: true });
    }
  }, [user, loading, navigate, params]);

  useEffect(() => {
    return () => {
      void stopScan();
    };
  }, []);

  async function stopScan() {
    const s = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (s) {
      try {
        if (s.isScanning) await s.stop();
        await s.clear();
      } catch {
        /* ignore */
      }
    }
  }

  async function startScan() {
    setErr(null);
    setOk(null);
    await stopScan();
    setScanning(true);
    const scanner = new Html5Qrcode(boxId);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          void onToken(extractToken(decoded), false);
        },
        () => undefined,
      );
    } catch {
      setScanning(false);
      setErr(t("join.cameraError"));
    }
  }

  async function onToken(token: string, confirmReplace: boolean) {
    if (!token || busy) return;
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      await stopScan();
      const res = await api.joinCoach(token, confirmReplace);
      setNeedReplace(false);
      if (res.alreadyLinked) {
        setOk(t("join.already"));
      } else {
        const name = [res.coach?.firstName, res.coach?.lastName].filter(Boolean).join(" ");
        setOk(name ? t("join.successNamed", { name }) : t("join.success"));
      }
      setManual("");
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : "";
      if (msg === "CONFIRM_REPLACE_REQUIRED") {
        setNeedReplace(true);
        setManual(token);
        setErr(t("join.replaceHint"));
      } else if (msg === "INVALID_OR_EXPIRED_QR") setErr(t("join.expired"));
      else if (msg === "COACH_NOT_FOUND") setErr(t("join.noCoach"));
      else setErr(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const tkn = params.get("t");
    if (user && tkn && !ok && !needReplace) {
      void onToken(tkn, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="wrap section">
      <p className="kicker">{t("join.kicker")}</p>
      <h1>{t("join.title")}</h1>
      <p className="lead">{t("join.lead")}</p>

      <div className="grid two" style={{ marginTop: "1.2rem" }}>
        <article className="card">
          <h2>{t("join.cameraTitle")}</h2>
          <p className="muted">{t("join.cameraLead")}</p>
          <div id={boxId} className="qr-reader" />
          <div className="row" style={{ marginTop: "0.8rem" }}>
            {!scanning ? (
              <button type="button" disabled={busy} onClick={() => void startScan()}>
                {t("join.startCamera")}
              </button>
            ) : (
              <button type="button" className="ghost" onClick={() => void stopScan()}>
                {t("join.stopCamera")}
              </button>
            )}
          </div>
        </article>

        <article className="card">
          <h2>{t("join.manualTitle")}</h2>
          <label>
            {t("join.manualLabel")}
            <textarea
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              rows={3}
              placeholder="https://…/join?t=…"
            />
          </label>
          <div className="row" style={{ marginTop: "0.8rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <button
              type="button"
              disabled={busy || !manual.trim()}
              onClick={() => void onToken(extractToken(manual), false)}
            >
              {t("join.submit")}
            </button>
            {needReplace && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onToken(extractToken(manual), true)}
              >
                {t("join.replace")}
              </button>
            )}
          </div>
        </article>
      </div>

      {ok && <p className="ok" style={{ marginTop: "1rem" }}>{ok}</p>}
      {err && <p className="error" style={{ marginTop: "1rem" }}>{err}</p>}
      <p style={{ marginTop: "1.2rem" }}>
        <Link to="/cabinet">{t("nav.cabinet")}</Link>
      </p>
    </div>
  );
}
