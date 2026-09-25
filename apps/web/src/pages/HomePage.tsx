import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { INVEST_ASSETS } from "../app/investData";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";

const TRACK_D =
  "M 60 20 " +
  "C 60 70, 28 110, 36 160 " +
  "S 95 220, 88 270 " +
  "S 30 330, 40 390 " +
  "S 100 460, 92 520 " +
  "S 25 590, 38 650 " +
  "S 105 720, 85 780 " +
  "S 50 840, 60 880";

const WAYPOINTS = [
  { id: "start", t: 0.02 },
  { id: "invest", t: 0.22 },
  { id: "how", t: 0.42 },
  { id: "stats", t: 0.62 },
  { id: "activity", t: 0.8 },
  { id: "finish", t: 0.97 },
] as const;

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useCountUp(target: number, active: boolean, duration = 1200, instant = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    if (instant) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration, instant]);
  return value;
}

function StatCounter({ value, suffix = "", active }: { value: number; suffix?: string; active: boolean }) {
  const reduced = usePrefersReducedMotion();
  const n = useCountUp(value, active, 1200, reduced);
  return (
    <b className="home-run-stat-n">
      {n}
      {suffix}
    </b>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const { s } = useSiteCopy();
  const { user } = useAuth();
  const startTo = user ? "/app" : "/login";
  const reducedMotion = usePrefersReducedMotion();

  const journeyRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const progressRef = useRef<SVGPathElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  const [progress, setProgress] = useState(0);
  const [activeWp, setActiveWp] = useState(0);
  const [statsInView, setStatsInView] = useState(false);
  const [wpPoints, setWpPoints] = useState<{ x: number; y: number }[]>([]);

  const assets = useMemo(() => INVEST_ASSETS.slice(0, 3), []);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    setWpPoints(
      WAYPOINTS.map((wp) => {
        const pt = path.getPointAtLength(wp.t * len);
        return { x: pt.x, y: pt.y };
      }),
    );
  }, []);

  useEffect(() => {
    let raf = 0;

    function update() {
      const journey = journeyRef.current;
      const path = pathRef.current;
      const marker = markerRef.current;
      const core = coreRef.current;
      const drawn = progressRef.current;
      if (!journey || !path) return;

      const rect = journey.getBoundingClientRect();
      const view = window.innerHeight;
      const total = Math.max(1, journey.offsetHeight - view);
      const scrolled = Math.min(total, Math.max(0, -rect.top));
      const p = reducedMotion ? Math.min(1, scrolled / total) : scrolled / total;
      setProgress(p);

      const len = path.getTotalLength();
      const pt = path.getPointAtLength(Math.min(1, Math.max(0, p)) * len);
      if (marker) {
        marker.setAttribute("cx", String(pt.x));
        marker.setAttribute("cy", String(pt.y));
      }
      if (core) {
        core.setAttribute("cx", String(pt.x));
        core.setAttribute("cy", String(pt.y));
      }
      if (drawn) {
        drawn.style.strokeDasharray = reducedMotion ? `${len} 0` : `${p * len} ${len}`;
      }

      let best = 0;
      let bestDist = Infinity;
      WAYPOINTS.forEach((wp, i) => {
        const d = Math.abs(wp.t - p);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setActiveWp(best);

      const statsEl = sectionRefs.current[3];
      if (statsEl) {
        const r = statsEl.getBoundingClientRect();
        if (r.top < view * 0.75 && r.bottom > view * 0.15) setStatsInView(true);
      }
    }

    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reducedMotion]);

  if (
    user?.roles.includes("ACCOUNTANT") &&
    !user.roles.includes("ADMIN") &&
    !user.roles.includes("COACH") &&
    !user.roles.includes("TRAINEE")
  ) {
    return <Navigate to="/accounting" replace />;
  }

  function goWp(i: number) {
    sectionRefs.current[i]?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
  }

  const pct = Math.round(progress * 100);

  return (
    <div className="home-run">
      <div className="home-run-bar">
        <div className="home-run-bar-inner wrap">
          <div className="home-run-bar-progress" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="home-run-bar-meta">{t("landing.maprunProgress", { pct })}</p>
          <Link to={startTo} className="home-run-bar-cta">
            {s("landing.ctaStart")}
          </Link>
        </div>
      </div>

      <div className="home-run-journey" ref={journeyRef}>
        <aside className="home-run-track" aria-hidden>
          <svg className="home-run-svg" viewBox="0 0 120 900" preserveAspectRatio="xMidYMid meet">
            <path className="home-run-path-base" d={TRACK_D} ref={pathRef} fill="none" />
            <path className="home-run-path-draw" d={TRACK_D} ref={progressRef} fill="none" />
            {wpPoints.map((pt, i) => (
              <circle
                key={WAYPOINTS[i].id}
                className={`home-run-wp-dot ${i <= activeWp ? "is-on" : ""} ${i === activeWp ? "is-now" : ""}`}
                cx={pt.x}
                cy={pt.y}
                r={i === activeWp ? 7 : 5}
                onClick={() => goWp(i)}
              />
            ))}
            <circle className="home-run-marker" ref={markerRef} cx={60} cy={20} r={9} />
            <circle className="home-run-marker-core" ref={coreRef} cx={60} cy={20} r={3.5} />
          </svg>
        </aside>

        <div className="home-run-stages">
          <section
            className={`home-run-stage ${activeWp === 0 ? "is-active" : ""}`}
            ref={(n) => {
              sectionRefs.current[0] = n;
            }}
            id="run-start"
          >
            <span className="home-run-badge">01 · {t("landing.maprunWpStart")}</span>
            <h1 className="home-run-brand">{s("appName")}</h1>
            <p className="home-run-hook">{t("landing.maprunHook")}</p>
            <p className="home-run-sub">{t("landing.maprunSub")}</p>
            <div className="home-run-cta-row">
              <Link to={startTo} className="home-run-btn">
                {s("landing.ctaStart")}
              </Link>
              <button type="button" className="home-run-btn-ghost" onClick={() => goWp(1)}>
                {t("landing.maprunScroll")}
              </button>
            </div>
          </section>

          <section
            className={`home-run-stage ${activeWp === 1 ? "is-active" : ""}`}
            ref={(n) => {
              sectionRefs.current[1] = n;
            }}
            id="run-invest"
          >
            <Reveal>
              <span className="home-run-badge">02 · {t("landing.maprunWpInvest")}</span>
              <h2>{t("landing.maprunInvestTitle")}</h2>
              <p className="home-run-lead">{t("landing.maprunInvestLead")}</p>
            </Reveal>
            <div className="home-run-assets">
              {assets.map((a, i) => (
                <Reveal key={a.id} delay={i * 80}>
                  <article className="home-run-asset">
                    <div className="home-run-asset-top">
                      <span>{a.sport}</span>
                      <em className={a.changePct >= 0 ? "is-up" : "is-down"}>
                        {a.changePct >= 0 ? "+" : ""}
                        {a.changePct}%
                      </em>
                    </div>
                    <strong>{a.name}</strong>
                    <p>{a.tagline}</p>
                    <div className="home-run-asset-foot">
                      <span>{formatSom(a.price)} сом</span>
                      <span>YTD {a.yieldYtd}%</span>
                    </div>
                    <svg className="home-run-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden>
                      <polyline
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        points={a.chart
                          .map((v, idx) => `${(idx / (a.chart.length - 1)) * 100},${28 - (v / 100) * 26}`)
                          .join(" ")}
                      />
                    </svg>
                  </article>
                </Reveal>
              ))}
            </div>
          </section>

          <section
            className={`home-run-stage ${activeWp === 2 ? "is-active" : ""}`}
            ref={(n) => {
              sectionRefs.current[2] = n;
            }}
            id="run-how"
          >
            <Reveal>
              <span className="home-run-badge">03 · {t("landing.maprunWpHow")}</span>
              <h2>{t("landing.maprunHowTitle")}</h2>
              <p className="home-run-lead">{t("landing.maprunHowLead")}</p>
            </Reveal>
            <ol className="home-run-steps">
              {[1, 2, 3].map((n, i) => (
                <Reveal key={n} delay={i * 100}>
                  <li className="home-run-step">
                    <span className="home-run-step-n">{n}</span>
                    <div>
                      <strong>{t(`landing.maprunHow${n}t`)}</strong>
                      <p>{t(`landing.maprunHow${n}`)}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
          </section>

          <section
            className={`home-run-stage ${activeWp === 3 ? "is-active" : ""}`}
            ref={(n) => {
              sectionRefs.current[3] = n;
            }}
            id="run-stats"
          >
            <Reveal>
              <span className="home-run-badge">04 · {t("landing.maprunWpStats")}</span>
              <h2>{t("landing.maprunStatsTitle")}</h2>
              <p className="home-run-lead">{t("landing.maprunStatsLead")}</p>
            </Reveal>
            <div className="home-run-stats">
              <Reveal>
                <div className="home-run-stat">
                  <StatCounter value={82} suffix="%" active={statsInView} />
                  <span>{t("landing.maprunStat1")}</span>
                </div>
              </Reveal>
              <Reveal delay={80}>
                <div className="home-run-stat">
                  <StatCounter value={4820} active={statsInView} />
                  <span>{t("landing.maprunStat2")}</span>
                </div>
              </Reveal>
              <Reveal delay={160}>
                <div className="home-run-stat">
                  <StatCounter value={96} suffix="M" active={statsInView} />
                  <span>{t("landing.maprunStat3")}</span>
                </div>
              </Reveal>
            </div>
          </section>

          <section
            className={`home-run-stage ${activeWp === 4 ? "is-active" : ""}`}
            ref={(n) => {
              sectionRefs.current[4] = n;
            }}
            id="run-activity"
          >
            <Reveal>
              <span className="home-run-badge">05 · {t("landing.maprunWpActivity")}</span>
              <h2>{t("landing.maprunActTitle")}</h2>
              <p className="home-run-lead">{t("landing.maprunActLead")}</p>
            </Reveal>
            <div className="home-run-rings">
              {[
                { label: t("landing.maprunRing1"), p: 72 },
                { label: t("landing.maprunRing2"), p: 45 },
                { label: t("landing.maprunRing3"), p: 88 },
              ].map((ring, i) => (
                <Reveal key={ring.label} delay={i * 90} variant="scale">
                  <div className="home-run-ring">
                    <div
                      className="home-run-ring-viz"
                      style={{ ["--p" as string]: String(ring.p) }}
                      aria-hidden
                    >
                      <span>{ring.p}%</span>
                    </div>
                    <strong>{ring.label}</strong>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          <section
            className={`home-run-stage home-run-finish ${activeWp === 5 ? "is-active" : ""}`}
            ref={(n) => {
              sectionRefs.current[5] = n;
            }}
            id="run-finish"
          >
            <Reveal variant="scale">
              <span className="home-run-badge">06 · {t("landing.maprunWpFinish")}</span>
              <h2>{t("landing.maprunFinishTitle")}</h2>
              <p className="home-run-lead">{t("landing.maprunFinishLead")}</p>
              <div className="home-run-tape" aria-hidden>
                <span>{t("landing.maprunTape")}</span>
              </div>
              <Link to={startTo} className="home-run-btn home-run-btn-lg">
                {t("landing.maprunFinishCta")}
              </Link>
            </Reveal>
          </section>
        </div>
      </div>
    </div>
  );
}
