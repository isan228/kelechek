import { useEffect, useMemo, useRef, useState } from "react";
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

const STOP_IDS = ["start", "join", "series", "save", "goal"] as const;

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
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeIdx, setActiveIdx] = useState(0);

  const journeyRef = useRef<HTMLDivElement>(null);
  const stopRefs = useRef<(HTMLElement | null)[]>([]);

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

  useEffect(() => {
    const root = journeyRef.current;
    if (!root) return;

    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = journeyRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const view = window.innerHeight;
        const total = el.offsetHeight - view;
        const scrolled = Math.min(total, Math.max(0, -rect.top));
        const p = total > 0 ? scrolled / total : 0;
        setScrollProgress(p);

        let best = 0;
        let bestDist = Infinity;
        stopRefs.current.forEach((node, i) => {
          if (!node) return;
          const r = node.getBoundingClientRect();
          const dist = Math.abs(r.top + r.height * 0.25 - view * 0.35);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });
        setActiveIdx(best);
      });
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const calc = useMemo(() => {
    const per = distributePayment(monthly, withCoach);
    return { perMonth: per.trainee, total: per.trainee * months };
  }, [monthly, months, withCoach]);

  const pathDraw = Math.min(100, Math.max(4, scrollProgress * 100));

  if (
    user?.roles.includes("ACCOUNTANT") &&
    !user.roles.includes("ADMIN") &&
    !user.roles.includes("COACH") &&
    !user.roles.includes("TRAINEE")
  ) {
    return <Navigate to="/accounting" replace />;
  }

  function goStop(i: number) {
    stopRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="home-v home-journey" ref={journeyRef}>
      <div className="home-journey-rail" aria-hidden>
        <svg className="home-journey-svg" viewBox="0 0 40 1000" preserveAspectRatio="none">
          <path
            className="home-journey-path-base"
            d="M20 20 C 20 80, 8 140, 20 200 S 32 320, 20 400 S 8 520, 20 600 S 32 720, 20 800 S 12 900, 20 980"
            pathLength={100}
          />
          <path
            className="home-journey-path-draw"
            d="M20 20 C 20 80, 8 140, 20 200 S 32 320, 20 400 S 8 520, 20 600 S 32 720, 20 800 S 12 900, 20 980"
            pathLength={100}
            style={{ strokeDasharray: `${pathDraw} ${100 - pathDraw}` }}
          />
        </svg>
        <div className="home-journey-rail-dots">
          {STOP_IDS.map((id, i) => (
            <button
              key={id}
              type="button"
              className={`home-journey-rail-dot ${i <= activeIdx ? "is-on" : ""} ${i === activeIdx ? "is-now" : ""}`}
              style={{ top: `${8 + i * 21}%` }}
              onClick={() => goStop(i)}
              aria-label={t(`landing.mapStop${i + 1}`)}
            />
          ))}
        </div>
      </div>

      <div className="home-journey-progress" aria-hidden>
        <span style={{ width: `${pathDraw}%` }} />
      </div>

      {/* 1 — Старт */}
      <section
        className={`home-stop home-stop-hero ${activeIdx === 0 ? "is-active" : ""}`}
        id="stop-start"
        ref={(n) => {
          stopRefs.current[0] = n;
        }}
      >
        <div className="home-stop-pin" aria-hidden>
          <span>1</span>
        </div>
        <div className="wrap home-stop-body">
          <p className="home-kicker home-kicker-anim">{t("landing.mapKicker")}</p>
          <h1 className="home-brand home-brand-anim">{s("appName")}</h1>
          <p className="home-title home-title-anim">{t("landing.mapTitle")}</p>
          <p className="home-lead home-lead-anim">{t("landing.mapLead")}</p>
          <div className="cta-row home-cta-anim">
            <Link to={startTo}>
              <button type="button">{s("landing.ctaStart")}</button>
            </Link>
            <button type="button" className="ghost" onClick={() => goStop(1)}>
              {t("landing.mapScrollCta")}
            </button>
          </div>
          <div className="home-terrain" aria-hidden>
            <span className="home-terrain-hill a" />
            <span className="home-terrain-hill b" />
            <span className="home-terrain-hill c" />
          </div>
        </div>
      </section>

      {/* 2 — Абонемент */}
      <section
        className={`home-stop ${activeIdx === 1 ? "is-active" : ""}`}
        id="stop-join"
        ref={(n) => {
          stopRefs.current[1] = n;
        }}
      >
        <div className="home-stop-pin" aria-hidden>
          <span>2</span>
        </div>
        <div className="wrap home-stop-body">
          <Reveal>
            <p className="home-kicker">{t("landing.mapStop2")}</p>
            <h2>{t("landing.mapStop2Title")}</h2>
            <p className="muted">{t("landing.mapStop2Desc")}</p>
          </Reveal>
          <div className="home-stop-cards">
            <Reveal variant="left" delay={60}>
              <article className="home-stop-card">
                <h3>{t("landing.beforeTitle")}</h3>
                <ul>
                  <li>{t("landing.before1")}</li>
                  <li>{t("landing.before2")}</li>
                  <li>{t("landing.before3")}</li>
                </ul>
              </article>
            </Reveal>
            <Reveal variant="right" delay={120}>
              <article className="home-stop-card is-accent">
                <h3>{t("landing.afterTitle")}</h3>
                <ul>
                  <li>{t("landing.after1")}</li>
                  <li>{t("landing.after2")}</li>
                  <li>{t("landing.after3")}</li>
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 3 — Серия */}
      <section
        className={`home-stop ${activeIdx === 2 ? "is-active" : ""}`}
        id="stop-series"
        ref={(n) => {
          stopRefs.current[2] = n;
        }}
      >
        <div className="home-stop-pin" aria-hidden>
          <span>3</span>
        </div>
        <div className="wrap home-stop-body">
          <Reveal>
            <p className="home-kicker">{t("landing.mapStop3")}</p>
            <h2>{t("landing.mapStop3Title")}</h2>
            <p className="muted">{t("landing.mapStop3Desc")}</p>
          </Reveal>
          <div className="home-stop-steps">
            {[1, 2, 3].map((n, i) => (
              <Reveal key={n} delay={i * 90} variant="up">
                <div className="home-stop-step">
                  <span className="home-stop-step-n">{n}</span>
                  <strong>{t(`landing.mapSeries${n}`)}</strong>
                  <p className="muted">{t(`landing.mapSeries${n}Lead`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — Накопление / калькулятор */}
      <section
        className={`home-stop ${activeIdx === 3 ? "is-active" : ""}`}
        id="stop-save"
        ref={(n) => {
          stopRefs.current[3] = n;
        }}
      >
        <div className="home-stop-pin" aria-hidden>
          <span>4</span>
        </div>
        <div className="wrap home-stop-body">
          <Reveal>
            <p className="home-kicker">{t("landing.mapStop4")}</p>
            <h2>{t("landing.mapCalcTitle")}</h2>
            <p className="muted">{t("landing.mapCalcLead")}</p>
          </Reveal>

          <div className="home-calc">
            <Reveal variant="left">
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
            </Reveal>
            <Reveal variant="right" delay={80}>
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
                <Link to="/memberships" className="home-calc-cta">
                  <button type="button">{t("landing.calcGoPay")}</button>
                </Link>
                <p className="muted home-calc-note">{t("landing.calcDisclaimer")}</p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 5 — Цель */}
      <section
        className={`home-stop home-stop-goal ${activeIdx === 4 ? "is-active" : ""}`}
        id="stop-goal"
        ref={(n) => {
          stopRefs.current[4] = n;
        }}
      >
        <div className="home-stop-pin is-goal" aria-hidden>
          <span>★</span>
        </div>
        <div className="wrap home-stop-body">
          <Reveal variant="scale">
            <p className="home-kicker">{t("landing.mapStop5")}</p>
            <h2>{t("landing.mapStop5Title")}</h2>
            <p className="muted">{t("landing.mapStop5Desc")}</p>
            <div className="cta-row" style={{ marginTop: "1.5rem" }}>
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
          <div className="home-finish-flag" aria-hidden>
            <span />
          </div>
        </div>
      </section>
    </div>
  );
}
