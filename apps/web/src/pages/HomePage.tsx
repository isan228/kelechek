import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

/** Хаотичный трек (viewBox 0 0 1000 3200) — без симметрии */
const TRACK_D =
  "M 480 40 " +
  "C 820 90, 940 200, 880 340 " +
  "C 800 520, 90 480, 70 680 " +
  "C 50 880, 900 820, 940 1020 " +
  "C 980 1220, 140 1180, 100 1400 " +
  "C 55 1620, 860 1580, 900 1800 " +
  "C 950 2020, 180 1980, 140 2200 " +
  "C 95 2420, 780 2380, 820 2600 " +
  "C 870 2820, 320 2780, 280 2980 " +
  "C 250 3080, 420 3140, 500 3160";

type Edge = "left" | "right";

type Spot = {
  id: string;
  n: number;
  t: number;
  edge: Edge;
  y: string;
  x?: string;
  rotate: number;
  scale: number;
  kind: "start" | "streak" | "coach" | "gyms" | "uni" | "finish";
  branch?: boolean;
};

const SPOTS: Spot[] = [
  { id: "start", n: 1, t: 0.03, edge: "left", y: "1.5%", rotate: -3, scale: 1.06, kind: "start" },
  { id: "streak", n: 2, t: 0.2, edge: "right", y: "14%", rotate: 4, scale: 1.1, kind: "streak", branch: true },
  { id: "coach", n: 3, t: 0.38, edge: "left", y: "30%", rotate: -5, scale: 0.96, kind: "coach" },
  { id: "gyms", n: 4, t: 0.55, edge: "right", y: "46%", rotate: 3, scale: 1, kind: "gyms", branch: true },
  { id: "uni", n: 5, t: 0.72, edge: "left", y: "62%", rotate: -2.5, scale: 0.98, kind: "uni" },
  { id: "finish", n: 6, t: 0.92, edge: "right", y: "78%", rotate: 5, scale: 1.04, kind: "finish" },
];

const COACHES = [
  { id: "c1", specKey: "journeyCoachSpec1", nameKey: "journeyCoach1", years: 8 },
  { id: "c2", specKey: "journeyCoachSpec2", nameKey: "journeyCoach2", years: 5 },
  { id: "c3", specKey: "journeyCoachSpec3", nameKey: "journeyCoach3", years: 11 },
];

const GYMS = [
  { id: "g1", nameKey: "journeyGym1", dist: "1.2 км" },
  { id: "g2", nameKey: "journeyGym2", dist: "2.4 км" },
  { id: "g3", nameKey: "journeyGym3", dist: "3.1 км" },
  { id: "g4", nameKey: "journeyGym4", dist: "4.0 км" },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function HomePage() {
  const { t } = useTranslation();
  const { s } = useSiteCopy();
  const { user } = useAuth();
  const ctaTo = user ? "/memberships" : "/login";
  const reduced = usePrefersReducedMotion();

  const mapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const drawRef = useRef<SVGPathElement>(null);
  const glowRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState("start");
  const [finished, setFinished] = useState(false);
  const [coachIdx, setCoachIdx] = useState(0);
  const [branches, setBranches] = useState<{ d: string }[]>([]);

  useEffect(() => {
    let raf = 0;
    function update() {
      const map = mapRef.current;
      const path = pathRef.current;
      const draw = drawRef.current;
      const glow = glowRef.current;
      const marker = markerRef.current;
      const core = coreRef.current;
      if (!map || !path) return;

      const rect = map.getBoundingClientRect();
      const view = window.innerHeight;
      const total = Math.max(1, map.offsetHeight - view);
      const scrolled = Math.min(total, Math.max(0, -rect.top));
      const p = reduced ? 1 : scrolled / total;
      setProgress(p);
      setFinished(p >= 0.94);

      const len = path.getTotalLength();
      if (draw) {
        if (reduced) {
          draw.style.strokeDasharray = "none";
          draw.style.strokeDashoffset = "0";
        } else {
          draw.style.strokeDasharray = String(len);
          draw.style.strokeDashoffset = String(len * (1 - p));
        }
      }
      if (glow) {
        if (reduced) {
          glow.style.strokeDasharray = "none";
          glow.style.strokeDashoffset = "0";
        } else {
          glow.style.strokeDasharray = String(len);
          glow.style.strokeDashoffset = String(len * (1 - p));
        }
      }

      if (marker && core) {
        const pt = path.getPointAtLength(len * (reduced ? 1 : p));
        marker.setAttribute("cx", String(pt.x));
        marker.setAttribute("cy", String(pt.y));
        core.setAttribute("cx", String(pt.x));
        core.setAttribute("cy", String(pt.y));
      }

      let nearest = SPOTS[0];
      let best = Infinity;
      for (const spot of SPOTS) {
        const d = Math.abs(spot.t - p);
        if (d < best) {
          best = d;
          nearest = spot;
        }
      }
      setActiveId(nearest.id);

      // тонкие ответвления к «оторванным» карточкам
      const vbW = 1000;
      const vbH = 3200;
      const mapW = map.offsetWidth || 1;
      const mapH = map.offsetHeight || 1;
      setBranches(
        SPOTS.map((spot, i) => {
          if (!spot.branch) return { d: "" };
          const el = cardRefs.current[i];
          if (!el) return { d: "" };
          const r = el.getBoundingClientRect();
          const mr = map.getBoundingClientRect();
          const cx = ((r.left + r.width / 2 - mr.left) / mapW) * vbW;
          const cy = ((r.top + r.height / 2 - mr.top) / mapH) * vbH;
          const pt = path.getPointAtLength(len * spot.t);
          const mx = (pt.x + cx) / 2 + (spot.edge === "right" ? 40 : -40);
          const my = (pt.y + cy) / 2;
          return { d: `M ${pt.x} ${pt.y} Q ${mx} ${my} ${cx} ${cy}` };
        }),
      );

      raf = 0;
    }

    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced]);

  if (
    user?.roles.includes("ACCOUNTANT") &&
    !user.roles.includes("ADMIN") &&
    !user.roles.includes("COACH") &&
    !user.roles.includes("TRAINEE")
  ) {
    return <Navigate to="/accounting" replace />;
  }

  function goSpot(i: number) {
    cardRefs.current[i]?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

  const pct = Math.round(progress * 100);

  return (
    <div className={`home-journey ${finished ? "is-finished" : ""}`}>
      <div className="home-journey-sticky" role="banner">
        <div className="home-journey-sticky-inner">
          <Link to="/" className="home-journey-sticky-brand">
            {s("appName")}
          </Link>
          <p className="home-journey-sticky-prog">
            <span>{t("landing.journeyProgress", { pct })}</span>
            <i style={{ width: `${pct}%` }} />
          </p>
          <Link to={ctaTo} className="home-journey-sticky-cta">
            {t("landing.journeyCta")}
          </Link>
        </div>
      </div>

      <div className="home-journey-map" ref={mapRef}>
        <svg className="home-journey-svg" viewBox="0 0 1000 3200" preserveAspectRatio="none" aria-hidden>
          <path className="home-journey-bed" d={TRACK_D} fill="none" />
          <path ref={pathRef} className="home-journey-base" d={TRACK_D} fill="none" />
          <path ref={glowRef} className="home-journey-glow" d={TRACK_D} fill="none" />
          <path ref={drawRef} className="home-journey-draw" d={TRACK_D} fill="none" />
          {branches.map((b, i) =>
            b.d ? <path key={`br-${SPOTS[i].id}`} className="home-journey-branch" d={b.d} fill="none" /> : null,
          )}
          <circle
            ref={markerRef}
            className={`home-journey-marker ${finished ? "is-done" : ""}`}
            cx={480}
            cy={40}
            r={14}
          />
          <circle ref={coreRef} className="home-journey-core" cx={480} cy={40} r={5} />
        </svg>

        {SPOTS.map((spot, i) => (
          <article
            key={spot.id}
            ref={(n) => {
              cardRefs.current[i] = n;
            }}
            className={`home-journey-card home-journey-card-${spot.kind} home-journey-edge-${spot.edge} ${
              progress >= spot.t - 0.07 || reduced ? "is-visible" : ""
            } ${activeId === spot.id ? "is-active" : ""} ${spot.branch ? "is-branch" : ""}`}
            style={{
              top: spot.y,
              ["--rot" as string]: `${spot.rotate}deg`,
              ["--scale" as string]: String(spot.scale),
            }}
          >
            <span className="home-journey-num" aria-hidden>
              {spot.n}
            </span>

            {spot.kind === "start" && (
              <>
                <p className="home-journey-kicker">{t("landing.journeyWpStart")}</p>
                <h1>{s("appName")}</h1>
                <p className="home-journey-hook">{t("landing.journeyHook")}</p>
                <p className="home-journey-note">{t("landing.journeySub")}</p>
                <div className="home-journey-actions">
                  <Link to={ctaTo} className="home-journey-btn">
                    {t("landing.journeyCta")}
                  </Link>
                  <button type="button" className="home-journey-btn-ghost" onClick={() => goSpot(1)}>
                    {t("landing.journeyScroll")}
                  </button>
                </div>
              </>
            )}

            {spot.kind === "streak" && (
              <>
                <p className="home-journey-kicker">{t("landing.journeyWpStreak")}</p>
                <h2>{t("landing.journeyStreakTitle")}</h2>
                <p className="home-journey-note">{t("landing.journeyStreakLead")}</p>

                <div className="home-journey-streak" aria-label={t("landing.journeyStreakTitle")}>
                  {[1, 2, 3, 4].map((y) => (
                    <div key={y} className={`home-journey-ring ${y === 4 ? "is-refund" : ""}`} style={{ ["--p" as string]: String(y <= 2 ? 100 : y === 3 ? 55 : 0) }}>
                      <span>
                        {y === 4 ? (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path
                              d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z"
                              stroke="currentColor"
                              strokeWidth="1.8"
                            />
                            <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M12 12v4M10 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        ) : (
                          <>
                            {y}
                            <small>{t("landing.journeyYear")}</small>
                          </>
                        )}
                      </span>
                      <strong>{t("landing.journeyYearN", { n: y })}</strong>
                    </div>
                  ))}
                </div>

                <div className="home-journey-refund">
                  <b>{t("landing.journeyRefundValue")}</b>
                  <span>{t("landing.journeyRefundLabel")}</span>
                </div>
                <p className="home-journey-break">{t("landing.journeyStreakBreak")}</p>
              </>
            )}

            {spot.kind === "coach" && (
              <>
                <p className="home-journey-kicker">{t("landing.journeyWpCoach")}</p>
                <h2>{t("landing.journeyCoachTitle")}</h2>
                <p className="home-journey-note">{t("landing.journeyCoachLead")}</p>
                <div className="home-journey-coach">
                  <button
                    type="button"
                    className="home-journey-coach-nav"
                    aria-label={t("landing.journeyPrev")}
                    onClick={() => setCoachIdx((v) => (v + COACHES.length - 1) % COACHES.length)}
                  >
                    ‹
                  </button>
                  <div className="home-journey-coach-card" key={COACHES[coachIdx].id}>
                    <div className="home-journey-coach-ava">{t(`landing.${COACHES[coachIdx].nameKey}`).slice(0, 1)}</div>
                    <strong>{t(`landing.${COACHES[coachIdx].nameKey}`)}</strong>
                    <span>{t(`landing.${COACHES[coachIdx].specKey}`)}</span>
                    <em>
                      {COACHES[coachIdx].years} {t("landing.journeyYears")}
                    </em>
                  </div>
                  <button
                    type="button"
                    className="home-journey-coach-nav"
                    aria-label={t("landing.journeyNext")}
                    onClick={() => setCoachIdx((v) => (v + 1) % COACHES.length)}
                  >
                    ›
                  </button>
                </div>
                <div className="home-journey-chips">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`home-journey-chip ${coachIdx === n - 1 ? "is-on" : ""}`}
                      onClick={() => setCoachIdx(n - 1)}
                    >
                      {t(`landing.journeyCoachSpec${n}`)}
                    </button>
                  ))}
                </div>
              </>
            )}

            {spot.kind === "gyms" && (
              <>
                <p className="home-journey-kicker">{t("landing.journeyWpGyms")}</p>
                <h2>{t("landing.journeyGymsTitle")}</h2>
                <p className="home-journey-note">{t("landing.journeyGymsLead")}</p>
                <p className="home-journey-big">
                  24<span>{t("landing.journeyGymsCount")}</span>
                </p>
                <div className="home-journey-gyms">
                  {GYMS.map((g) => (
                    <div key={g.id} className="home-journey-gym">
                      <strong>{t(`landing.${g.nameKey}`)}</strong>
                      <span>{g.dist}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {spot.kind === "uni" && (
              <>
                <p className="home-journey-kicker">{t("landing.journeyWpUni")}</p>
                <h2>{t("landing.journeyUniTitle")}</h2>
                <p className="home-journey-note">{t("landing.journeyUniLead")}</p>
                <ul className="home-journey-uni">
                  {[1, 2, 3].map((n) => (
                    <li key={n}>
                      <b>{n}</b>
                      <div>
                        <strong>{t(`landing.journeyUni${n}t`)}</strong>
                        <span>{t(`landing.journeyUni${n}`)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {spot.kind === "finish" && (
              <>
                <p className="home-journey-kicker">{t("landing.journeyWpFinish")}</p>
                <h2>{t("landing.journeyFinishTitle")}</h2>
                <p className="home-journey-note">{t("landing.journeyFinishLead")}</p>
                <div className={`home-journey-finish-mark ${finished || reduced ? "is-on" : ""}`} aria-hidden>
                  <span>✓</span>
                </div>
                <Link to={ctaTo} className="home-journey-btn home-journey-btn-lg">
                  {t("landing.journeyCta")}
                </Link>
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
