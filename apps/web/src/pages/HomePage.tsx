import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { distributePayment } from "@kelech/shared";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";

function formatSom(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "ky" ? "ky-KG" : "ru-KG", { maximumFractionDigits: 0 }).format(n);
}

const STOPS = [
  { id: "start", x: 8, y: 78, key: "mapStop1" },
  { id: "pay", x: 28, y: 42, key: "mapStop2" },
  { id: "series", x: 50, y: 68, key: "mapStop3" },
  { id: "save", x: 72, y: 32, key: "mapStop4" },
  { id: "goal", x: 92, y: 58, key: "mapStop5" },
] as const;

/** Path through stop centers (viewBox 0 0 100 100) */
const PATH_D =
  "M 8 78 C 14 78, 18 42, 28 42 S 40 68, 50 68 S 62 32, 72 32 S 84 58, 92 58";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { s } = useSiteCopy();
  const { user } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const startTo = user ? "/app" : "/login";

  const [months, setMonths] = useState(6);
  const [withCoach, setWithCoach] = useState(false);
  const [monthly, setMonthly] = useState(2500);
  const [tariffName, setTariffName] = useState("");
  const [activeStop, setActiveStop] = useState(0);

  useEffect(() => {
    void api
      .tariffs(locale)
      .then((r) => {
        const first = r.tariffs[0];
        if (first) {
          setMonthly(first.priceKgs);
          setTariffName(first.name);
        }
      })
      .catch(() => undefined);
  }, [locale]);

  const calc = useMemo(() => {
    const per = distributePayment(monthly, withCoach);
    return {
      perMonth: per.trainee,
      total: per.trainee * months,
    };
  }, [monthly, months, withCoach]);

  const reached = useMemo(() => {
    // 1–24 months → how many of 5 stops are lit (always at least start)
    return Math.min(STOPS.length, Math.max(1, Math.ceil((months / 24) * STOPS.length)));
  }, [months]);

  const pathProgress = useMemo(() => {
    // approximate dash offset progress 0–1
    return Math.min(1, Math.max(0.08, (reached - 1) / (STOPS.length - 1)));
  }, [reached]);

  useEffect(() => {
    setActiveStop(Math.min(STOPS.length - 1, reached - 1));
  }, [reached]);

  if (
    user?.roles.includes("ACCOUNTANT") &&
    !user.roles.includes("ADMIN") &&
    !user.roles.includes("COACH") &&
    !user.roles.includes("TRAINEE")
  ) {
    return <Navigate to="/accounting" replace />;
  }

  return (
    <div className="home-v home-map-page">
      <section className="home-map-hero">
        <div className="wrap home-map-hero-inner">
          <p className="home-kicker">{t("landing.mapKicker")}</p>
          <h1 className="home-brand">{s("appName")}</h1>
          <p className="home-title">{t("landing.mapTitle")}</p>
          <p className="home-lead">{t("landing.mapLead")}</p>
          <div className="cta-row">
            <Link to={startTo}>
              <button type="button">{s("landing.ctaStart")}</button>
            </Link>
            <a href="#route-planner">
              <button type="button" className="ghost">
                {t("landing.calcCta")}
              </button>
            </a>
          </div>
        </div>
      </section>

      <section className="home-map-section" aria-labelledby="map-heading">
        <div className="wrap">
          <Reveal>
            <div className="home-section-head">
              <p className="home-kicker">{t("landing.mapRouteKicker")}</p>
              <h2 id="map-heading">{t("landing.mapRouteTitle")}</h2>
              <p className="muted">{t("landing.mapRouteLead")}</p>
            </div>
          </Reveal>

          <div className="home-map" role="img" aria-label={t("landing.mapRouteTitle")}>
            <svg className="home-map-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="homeMapFill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="var(--signal)" stopOpacity="0.06" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="100" height="100" fill="url(#homeMapFill)" />
              {/* terrain hints */}
              <circle cx="22" cy="22" r="10" className="home-map-blob" />
              <circle cx="78" cy="80" r="12" className="home-map-blob" />
              <circle cx="55" cy="18" r="7" className="home-map-blob is-soft" />

              {/* base dotted path */}
              <path
                d={PATH_D}
                className="home-map-path-base"
                fill="none"
                pathLength={100}
              />
              {/* progress along path */}
              <path
                d={PATH_D}
                className="home-map-path-progress"
                fill="none"
                pathLength={100}
                style={{ strokeDasharray: `${pathProgress * 100} ${100 - pathProgress * 100}` }}
              />
            </svg>

            <ol className="home-map-stops">
              {STOPS.map((stop, i) => {
                const done = i < reached;
                const current = i === reached - 1;
                return (
                  <li
                    key={stop.id}
                    className={`home-map-stop ${done ? "is-done" : ""} ${current ? "is-current" : ""} ${
                      activeStop === i ? "is-active" : ""
                    }`}
                    style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
                  >
                    <button
                      type="button"
                      className="home-map-pin"
                      onClick={() => setActiveStop(i)}
                      aria-pressed={activeStop === i}
                      aria-label={t(`landing.${stop.key}`)}
                    >
                      <span className="home-map-pin-dot">{i + 1}</span>
                    </button>
                    <span className="home-map-pin-label">{t(`landing.${stop.key}`)}</span>
                  </li>
                );
              })}
            </ol>

            <div className="home-map-legend" aria-live="polite">
              <p className="home-map-legend-title">{t(`landing.${STOPS[activeStop].key}`)}</p>
              <p className="muted">{t(`landing.${STOPS[activeStop].key}Desc`)}</p>
              <p className="home-map-legend-meta">
                {t("landing.mapProgress", { reached, total: STOPS.length, months })}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section home-section-alt" id="route-planner" aria-labelledby="calc-title">
        <div className="wrap">
          <Reveal>
            <div className="home-section-head">
              <p className="home-kicker">{t("landing.calcKicker")}</p>
              <h2 id="calc-title">{t("landing.mapCalcTitle")}</h2>
              <p className="muted">{t("landing.mapCalcLead")}</p>
            </div>
          </Reveal>

          <div className="home-calc">
            <div className="home-calc-controls">
              <label className="home-calc-field">
                <span>{t("landing.calcMonths")}</span>
                <div className="home-calc-months">
                  <strong>{months}</strong>
                  <input
                    type="range"
                    min={1}
                    max={24}
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    aria-valuemin={1}
                    aria-valuemax={24}
                    aria-valuenow={months}
                  />
                </div>
              </label>

              <label className="home-calc-field">
                <span>
                  {t("landing.calcMonthly")}
                  {tariffName ? ` · ${tariffName}` : ""}
                </span>
                <input
                  type="number"
                  min={500}
                  step={100}
                  value={monthly}
                  onChange={(e) => setMonthly(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>

              <div className="home-calc-toggle" role="group" aria-label={t("landing.calcMode")}>
                <button type="button" className={!withCoach ? "is-on" : ""} onClick={() => setWithCoach(false)}>
                  {t("landing.calcSolo")}
                </button>
                <button type="button" className={withCoach ? "is-on" : ""} onClick={() => setWithCoach(true)}>
                  {t("landing.calcCoach")}
                </button>
              </div>
              <p className="muted home-calc-hint">
                {withCoach ? t("landing.calcCoachHint") : t("landing.calcSoloHint")}
              </p>
            </div>

            <div className="home-calc-result" aria-live="polite">
              <p className="home-kicker">{t("landing.calcResultLabel")}</p>
              <p className="home-calc-sum">
                {formatSom(calc.total, locale)} <span>{t("pay.currency")}</span>
              </p>
              <p className="muted">
                {t("landing.calcPerMonth", {
                  amount: formatSom(calc.perMonth, locale),
                  months,
                })}
              </p>
              <p className="home-calc-map-note">
                {t("landing.mapCalcStops", { reached, total: STOPS.length })}
              </p>
              <Link to="/memberships" className="home-calc-cta">
                <button type="button">{t("landing.calcGoPay")}</button>
              </Link>
              <p className="muted home-calc-note">{t("landing.calcDisclaimer")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="wrap home-close">
          <Reveal>
            <h2>{t("landing.closingTitle")}</h2>
            <p className="muted">{t("landing.closingLead")}</p>
            <div className="cta-row">
              <Link to={startTo}>
                <button type="button">{s("landing.ctaStart")}</button>
              </Link>
              <Link to="/about">
                <button type="button" className="ghost">
                  {s("landing.ctaAbout")}
                </button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
