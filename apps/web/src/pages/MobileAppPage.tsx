import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";

type AppInfo = { version: string; build: number; sizeBytes: number; updatedAt: string };
type Step = { t: string; d: string };

const APK_PATH = "/downloads/kelechek.apk";
const TONES = ["#3ddc97", "#6f9bff", "#ffb84d", "#ff6fae"];

function detectPlatform() {
  const ua = navigator.userAgent;
  return {
    inApp: /KelechekApp\//.test(ua),
    android: /Android/i.test(ua),
    ios: /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
  };
}

export function MobileAppPage() {
  const { t } = useTranslation();
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [platform] = useState(detectPlatform);
  const autoStarted = useRef(false);

  const href = info ? `${APK_PATH}?v=${info.build}` : APK_PATH;
  const autoDownload = platform.android && !platform.inApp;

  useEffect(() => {
    fetch("/downloads/app.json", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<AppInfo>) : null))
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  useEffect(() => {
    if (platform.android || platform.ios) return;
    void QRCode.toDataURL(`${window.location.origin}/mobile`, {
      width: 360,
      margin: 1,
      color: { dark: "#0b0d11", light: "#ffffff" },
    }).then(setQr);
  }, [platform]);

  useEffect(() => {
    if (!autoDownload || autoStarted.current) return;
    autoStarted.current = true;
    const timer = window.setTimeout(() => {
      const a = document.createElement("a");
      a.href = href;
      a.download = "kelechek.apk";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [autoDownload, href]);

  const steps = t("mobileApp.steps", { returnObjects: true }) as unknown as Step[];
  const meta = info
    ? t("mobileApp.meta", { version: info.version, size: (info.sizeBytes / 1048576).toFixed(1) })
    : t("mobileApp.metaShort");

  return (
    <div className="hm mb">
      <section className="hm-hero">
        <div className="hm-blob hm-blob-a" aria-hidden />
        <div className="hm-blob hm-blob-b" aria-hidden />
        <div className="hm-w mb-grid">
          <div className="mb-copy">
            <span className="hm-pill">{t("mobileApp.pill")}</span>
            <h1>
              {t("mobileApp.titleA")}
              <span className="hm-gt">{t("mobileApp.titleB")}</span>
            </h1>
            <p className="hm-lead">{t("mobileApp.lead")}</p>

            {platform.inApp ? (
              <p className="mb-note mb-note-ok">{t("mobileApp.inApp")}</p>
            ) : (
              <>
                <div className="hm-cta">
                  <a className="hm-btn mb-download" href={href} download="kelechek.apk">
                    <DownloadIcon />
                    {t("mobileApp.download")}
                  </a>
                </div>
                <p className="mb-meta">{meta}</p>
                {autoDownload && <p className="mb-note">{t("mobileApp.autoStart")}</p>}
              </>
            )}
          </div>

          <aside className="mb-side">
            {qr && (
              <div className="hm-card mb-qr">
                <img src={qr} alt="" width={180} height={180} />
                <div>
                  <h3>{t("mobileApp.qrTitle")}</h3>
                  <p>{t("mobileApp.qrText")}</p>
                </div>
              </div>
            )}
            {platform.ios && (
              <div className="hm-card mb-info">
                <h3>{t("mobileApp.iosTitle")}</h3>
                <p>{t("mobileApp.iosText")}</p>
              </div>
            )}
            <div className="hm-card mb-info">
              <h3>{t("mobileApp.safeTitle")}</h3>
              <p>{t("mobileApp.safeText")}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="hm-sec hm-sec-tight">
        <div className="hm-w">
          <div className="hm-hd">
            <span className="hm-eye">{t("mobileApp.stepsTitle")}</span>
          </div>
          <div className="hm-bento">
            {steps.map((s, i) => (
              <div key={s.t} className="hm-card hm-step" style={{ "--c": TONES[i] } as CSSProperties}>
                <span className="hm-step-n">{i + 1}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v11M7 10.5 12 15.5l5-5M5 19.5h14" />
    </svg>
  );
}
