import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { INVEST_ASSETS } from "../app/investData";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

/** Спокойный трейл (viewBox 0 0 1000 2400) */
const TRACK_D =
  "M 500 30 " +
  "C 720 80, 860 180, 820 320 " +
  "C 770 480, 180 520, 140 680 " +
  "C 100 840, 780 900, 840 1060 " +
  "C 900 1220, 220 1280, 160 1440 " +
  "C 100 1600, 740 1680, 800 1840 " +
  "C 860 2000, 360 2080, 300 2220 " +
  "C 260 2300, 420 2360, 500 2380";

type Edge = "left" | "right";

type Spot = {
  id: string;
  t: number;
  edge: Edge;
  y: string;
  kind: "start" | "invest" | "how" | "stats" | "finish";
  faceKey: string;
  faceSubKey?: string;
};

const SPOTS: Spot[] = [
  {
    id: "start",
    t: 0.05,
    edge: "left",
    y: "2%",
    kind: "start",
    faceKey: "mapFaceStart",
    faceSubKey: "mapFaceStartSub",
  },
  {
    id: "invest",
    t: 0.25,
    edge: "right",
    y: "18%",
    kind: "invest",
    faceKey: "mapFaceInvest",
    faceSubKey: "mapFaceInvestSub",
  },
  {
    id: "how",
    t: 0.45,
    edge: "left",
    y: "36%",
    kind: "how",
    faceKey: "mapFaceHow",
    faceSubKey: "mapFaceHowSub",
  },
  {
    id: "stats",
    t: 0.68,
    edge: "right",
    y: "56%",
    kind: "stats",
    faceKey: "mapFaceStats",
    faceSubKey: "mapFaceStatsSub",
  },
  {
    id: "finish",
    t: 0.9,
    edge: "left",
    y: "76%",
    kind: "finish",
    faceKey: "mapFaceFinish",
    faceSubKey: "mapFaceFinishSub",
  },
];

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = () => setReduced(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function useCountUp(target: number, active: boolean, instant: boolean) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) {
      setV(0);
      return;
    }
    if (instant) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1000);
      setV(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, instant]);
  return v;
}

export function HomePage() {
  const { t } = useTranslation();
  const { s } = useSiteCopy();
  const { user } = useAuth();
  const startTo = user ? "/app" : "/login";
  const reduced = usePrefersReducedMotion();

  const mapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const drawRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState("start");
  const [statsOn, setStatsOn] = useState(false);

  const assets = useMemo(() => INVEST_ASSETS.slice(0, 3), []);
  const c82 = useCountUp(82, statsOn, reduced);
  const c4820 = useCountUp(4820, statsOn, reduced);
  const c96 = useCountUp(96, statsOn, reduced);

  useEffect(() => {
    let raf = 0;
    function update() {
      const map = mapRef.current;
      const path = pathRef.current;
      const draw = drawRef.current;
      const marker = markerRef.current;
      const core = coreRef.current;
      if (!map || !path) return;

      const rect = map.getBoundingClientRect();
      const view = window.innerHeight;
      const total = Math.max(1, map.offsetHeight - view);
      const scrolled = Math.min(total, Math.max(0, -rect.top));
      const p = scrolled / total;
      setProgress(p);

      const len = path.getTotalLength();
      if (draw) {
        draw.style.strokeDasharray = String(len);
        draw.style.strokeDashoffset = String(len * (1 - p));
      }

      if (marker && core) {
        const pt = path.getPointAtLength(len * p);
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
      setStatsOn(p >= 0.55);
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
  }, []);

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

  return (
    <div className="home-chaos">
      <div className="home-chaos-map" ref={mapRef}>
        <svg className="home-chaos-svg" viewBox="0 0 1000 2400" preserveAspectRatio="none" aria-hidden>
          <path className="home-chaos-road-bed" d={TRACK_D} fill="none" />
          <path ref={pathRef} className="home-chaos-path-base" d={TRACK_D} fill="none" />
          <path ref={drawRef} className="home-chaos-path-draw" d={TRACK_D} fill="none" />
          <circle ref={markerRef} className="home-chaos-marker" cx={500} cy={30} r={12} />
          <circle ref={coreRef} className="home-chaos-marker-core" cx={500} cy={30} r={4} />
        </svg>

        {SPOTS.map((spot, i) => (
          <div key={spot.id} className={`home-chaos-row home-chaos-row-${spot.edge}`} style={{ top: spot.y }}>
            <aside
              className={`home-chaos-face ${progress >= spot.t - 0.08 ? "is-visible" : ""} ${
                activeId === spot.id ? "is-active" : ""
              }`}
            >
              <p className="home-chaos-face-title">{t(`landing.${spot.faceKey}`)}</p>
              {spot.faceSubKey && <p className="home-chaos-face-sub">{t(`landing.${spot.faceSubKey}`)}</p>}
            </aside>

            <article
              ref={(n) => {
                cardRefs.current[i] = n;
              }}
              className={`home-chaos-card home-chaos-card-${spot.kind} ${
                progress >= spot.t - 0.08 ? "is-visible" : ""
              } ${activeId === spot.id ? "is-active" : ""}`}
            >
              {spot.kind === "start" && (
                <>
                  <p className="home-chaos-kicker">{t("landing.maprunWpStart")}</p>
                  <h1>{s("appName")}</h1>
                  <p className="home-chaos-hook">{t("landing.maprunHook")}</p>
                  <p className="home-chaos-note">{t("landing.maprunSub")}</p>
                  <div className="home-chaos-actions">
                    <Link to={startTo} className="home-chaos-btn">
                      {s("landing.ctaStart")}
                    </Link>
                    <button type="button" className="home-chaos-btn-ghost" onClick={() => goSpot(1)}>
                      {t("landing.maprunScroll")}
                    </button>
                  </div>
                </>
              )}

              {spot.kind === "invest" && (
                <>
                  <p className="home-chaos-kicker">{t("landing.maprunWpInvest")}</p>
                  <h2>{t("landing.maprunInvestTitle")}</h2>
                  <p className="home-chaos-note">{t("landing.maprunInvestLead")}</p>
                  <div className="home-chaos-assets">
                    {assets.map((a) => (
                      <div key={a.id} className="home-chaos-asset">
                        <div className="home-chaos-asset-top">
                          <span>{a.sport}</span>
                          <em className={a.changePct >= 0 ? "up" : "down"}>
                            {a.changePct >= 0 ? "+" : ""}
                            {a.changePct}%
                          </em>
                        </div>
                        <strong>{a.name}</strong>
                        <span>
                          {formatSom(a.price)} · YTD {a.yieldYtd}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {spot.kind === "how" && (
                <>
                  <p className="home-chaos-kicker">{t("landing.maprunWpHow")}</p>
                  <h2>{t("landing.maprunHowTitle")}</h2>
                  <ol className="home-chaos-steps">
                    {[1, 2, 3].map((n) => (
                      <li key={n}>
                        <b>{n}</b>
                        <div>
                          <strong>{t(`landing.maprunHow${n}t`)}</strong>
                          <span>{t(`landing.maprunHow${n}`)}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {spot.kind === "stats" && (
                <>
                  <p className="home-chaos-kicker">{t("landing.maprunWpStats")}</p>
                  <h2>{t("landing.maprunStatsTitle")}</h2>
                  <div className="home-chaos-stats">
                    <div>
                      <b>
                        {c82}
                        <small>%</small>
                      </b>
                      <span>{t("landing.maprunStat1")}</span>
                    </div>
                    <div>
                      <b>{c4820}</b>
                      <span>{t("landing.maprunStat2")}</span>
                    </div>
                    <div>
                      <b>
                        {c96}
                        <small>M</small>
                      </b>
                      <span>{t("landing.maprunStat3")}</span>
                    </div>
                  </div>
                </>
              )}

              {spot.kind === "finish" && (
                <>
                  <p className="home-chaos-kicker">{t("landing.maprunWpFinish")}</p>
                  <h2>{t("landing.maprunFinishTitle")}</h2>
                  <p className="home-chaos-note">{t("landing.maprunFinishLead")}</p>
                  <Link to={startTo} className="home-chaos-btn home-chaos-btn-lg">
                    {t("landing.maprunFinishCta")}
                  </Link>
                </>
              )}
            </article>
          </div>
        ))}
      </div>
    </div>
  );
}
