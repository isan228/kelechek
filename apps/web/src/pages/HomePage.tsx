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

type StopDef = {
  id: string;
  n: number;
  kicker: string;
  title: string;
  lead: string;
};

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
  const [activeIdx, setActiveIdx] = useState(0);
  const [passed, setPassed] = useState(0);

  const journeyRef = useRef<HTMLDivElement>(null);
  const stopRefs = useRef<(HTMLElement | null)[]>([]);

  const stops: StopDef[] = useMemo(
    () => [
      {
        id: "start",
        n: 1,
        kicker: t("landing.mapStop1"),
        title: s("appName"),
        lead: t("landing.mapLead"),
      },
      {
        id: "join",
        n: 2,
        kicker: t("landing.mapStop2"),
        title: t("landing.mapStop2Title"),
        lead: t("landing.mapStop2Desc"),
      },
      {
        id: "series",
        n: 3,
        kicker: t("landing.mapStop3"),
        title: t("landing.mapStop3Title"),
        lead: t("landing.mapStop3Desc"),
      },
      {
        id: "save",
        n: 4,
        kicker: t("landing.mapStop4"),
        title: t("landing.mapCalcTitle"),
        lead: t("landing.mapCalcLead"),
      },
      {
        id: "goal",
        n: 5,
        kicker: t("landing.mapStop5"),
        title: t("landing.mapStop5Title"),
        lead: t("landing.mapStop5Desc"),
      },
    ],
    [t, s],
  );

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
    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const view = window.innerHeight;
        const mid = view * 0.42;
        let best = 0;
        let bestDist = Infinity;
        let done = 0;

        stopRefs.current.forEach((node, i) => {
          if (!node) return;
          const r = node.getBoundingClientRect();
          const anchor = r.top + Math.min(120, r.height * 0.2);
          const dist = Math.abs(anchor - mid);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
          // segment to next stop is "passed" when pin area crossed mid
          if (anchor < mid) done = i + 1;
        });

        setActiveIdx(best);
        setPassed(Math.max(1, done));
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

  const progressPct = Math.min(100, Math.max(8, ((passed - 1) / (stops.length - 1)) * 100));

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
    <div className="home-v home-journey" ref={journeyRef} style={{ ["--home-progress" as string]: `${progressPct}%` }}>
      <div className="home-journey-progress" aria-hidden>
        <span style={{ width: `${progressPct}%` }} />
      </div>

      <div className="home-trail wrap">
        {/* continuous spine through all blocks */}
        <div className="home-trail-spine" aria-hidden>
          <div className="home-trail-line">
            <div className="home-trail-line-fill" />
          </div>
        </div>

        {/* STOP 1 — Старт */}
        <article
          className={`home-block ${activeIdx === 0 ? "is-active" : ""} ${passed > 0 ? "is-passed" : ""}`}
          id="stop-start"
          ref={(n) => {
            stopRefs.current[0] = n;
          }}
        >
          <button type="button" className="home-block-pin" onClick={() => goStop(0)} aria-label={stops[0].kicker}>
            <span>1</span>
          </button>
          <div className="home-block-card home-block-hero">
            <p className="home-kicker home-kicker-anim">{t("landing.mapKicker")}</p>
            <h1 className="home-brand home-brand-anim">{stops[0].title}</h1>
            <p className="home-title home-title-anim">{t("landing.mapTitle")}</p>
            <p className="home-lead home-lead-anim">{stops[0].lead}</p>
            <div className="cta-row home-cta-anim">
              <Link to={startTo}>
                <button type="button">{s("landing.ctaStart")}</button>
              </Link>
              <button type="button" className="ghost" onClick={() => goStop(1)}>
                {t("landing.mapScrollCta")}
              </button>
            </div>
          </div>
        </article>

        {/* STOP 2 */}
        <article
          className={`home-block ${activeIdx === 1 ? "is-active" : ""} ${passed > 1 ? "is-passed" : ""}`}
          id="stop-join"
          ref={(n) => {
            stopRefs.current[1] = n;
          }}
        >
          <button type="button" className="home-block-pin" onClick={() => goStop(1)} aria-label={stops[1].kicker}>
            <span>2</span>
          </button>
          <div className="home-block-card">
            <Reveal>
              <p className="home-kicker">{stops[1].kicker}</p>
              <h2>{stops[1].title}</h2>
              <p className="muted">{stops[1].lead}</p>
            </Reveal>
            <div className="home-stop-cards">
              <Reveal variant="left" delay={60}>
                <div className="home-stop-card">
                  <h3>{t("landing.beforeTitle")}</h3>
                  <ul>
                    <li>{t("landing.before1")}</li>
                    <li>{t("landing.before2")}</li>
                    <li>{t("landing.before3")}</li>
                  </ul>
                </div>
              </Reveal>
              <Reveal variant="right" delay={120}>
                <div className="home-stop-card is-accent">
                  <h3>{t("landing.afterTitle")}</h3>
                  <ul>
                    <li>{t("landing.after1")}</li>
                    <li>{t("landing.after2")}</li>
                    <li>{t("landing.after3")}</li>
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </article>

        {/* STOP 3 */}
        <article
          className={`home-block ${activeIdx === 2 ? "is-active" : ""} ${passed > 2 ? "is-passed" : ""}`}
          id="stop-series"
          ref={(n) => {
            stopRefs.current[2] = n;
          }}
        >
          <button type="button" className="home-block-pin" onClick={() => goStop(2)} aria-label={stops[2].kicker}>
            <span>3</span>
          </button>
          <div className="home-block-card">
            <Reveal>
              <p className="home-kicker">{stops[2].kicker}</p>
              <h2>{stops[2].title}</h2>
              <p className="muted">{stops[2].lead}</p>
            </Reveal>
            <div className="home-stop-steps">
              {[1, 2, 3].map((n, i) => (
                <Reveal key={n} delay={i * 90}>
                  <div className="home-stop-step">
                    <span className="home-stop-step-n">{n}</span>
                    <strong>{t(`landing.mapSeries${n}`)}</strong>
                    <p className="muted">{t(`landing.mapSeries${n}Lead`)}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </article>

        {/* STOP 4 */}
        <article
          className={`home-block ${activeIdx === 3 ? "is-active" : ""} ${passed > 3 ? "is-passed" : ""}`}
          id="stop-save"
          ref={(n) => {
            stopRefs.current[3] = n;
          }}
        >
          <button type="button" className="home-block-pin" onClick={() => goStop(3)} aria-label={stops[3].kicker}>
            <span>4</span>
          </button>
          <div className="home-block-card">
            <Reveal>
              <p className="home-kicker">{stops[3].kicker}</p>
              <h2>{stops[3].title}</h2>
              <p className="muted">{stops[3].lead}</p>
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
        </article>

        {/* STOP 5 */}
        <article
          className={`home-block home-block-last ${activeIdx === 4 ? "is-active" : ""} ${passed > 4 ? "is-passed" : ""}`}
          id="stop-goal"
          ref={(n) => {
            stopRefs.current[4] = n;
          }}
        >
          <button type="button" className="home-block-pin is-goal" onClick={() => goStop(4)} aria-label={stops[4].kicker}>
            <span>★</span>
          </button>
          <div className="home-block-card home-block-finish">
            <Reveal variant="scale">
              <p className="home-kicker">{stops[4].kicker}</p>
              <h2>{stops[4].title}</h2>
              <p className="muted">{stops[4].lead}</p>
              <div className="cta-row" style={{ marginTop: "1.35rem" }}>
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
        </article>
      </div>
    </div>
  );
}
