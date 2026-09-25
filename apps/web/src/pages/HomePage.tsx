import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { INVEST_ASSETS } from "../app/investData";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

/** Хаотичная дорожка / трейл (viewBox 0 0 1000 3000) */
const TRACK_D =
  "M 520 20 " +
  "C 780 60, 920 140, 860 260 " +
  "C 790 390, 120 430, 90 560 " +
  "C 55 700, 880 740, 930 880 " +
  "C 980 1020, 160 1080, 110 1220 " +
  "C 60 1360, 840 1400, 900 1540 " +
  "C 960 1680, 200 1720, 140 1860 " +
  "C 80 2000, 820 2060, 860 2200 " +
  "C 910 2340, 280 2400, 220 2540 " +
  "C 160 2680, 700 2740, 640 2860 " +
  "C 580 2940, 480 2980, 500 2990";

type Edge = "left" | "right";

type Spot = {
  id: string;
  t: number;
  edge: Edge;
  y: string;
  rotate: number;
  scale: number;
  kind: "start" | "invest" | "how" | "stats" | "activity" | "finish" | "quote";
  /** Текст напротив карточки */
  faceKey: string;
  faceSubKey?: string;
};

const SPOTS: Spot[] = [
  {
    id: "start",
    t: 0.04,
    edge: "left",
    y: "1%",
    rotate: -3,
    scale: 1.05,
    kind: "start",
    faceKey: "mapFaceStart",
    faceSubKey: "mapFaceStartSub",
  },
  {
    id: "invest",
    t: 0.18,
    edge: "right",
    y: "12%",
    rotate: 4,
    scale: 1,
    kind: "invest",
    faceKey: "mapFaceInvest",
    faceSubKey: "mapFaceInvestSub",
  },
  {
    id: "how",
    t: 0.34,
    edge: "left",
    y: "26%",
    rotate: -5,
    scale: 0.96,
    kind: "how",
    faceKey: "mapFaceHow",
    faceSubKey: "mapFaceHowSub",
  },
  {
    id: "stats",
    t: 0.5,
    edge: "right",
    y: "40%",
    rotate: 3,
    scale: 1.06,
    kind: "stats",
    faceKey: "mapFaceStats",
    faceSubKey: "mapFaceStatsSub",
  },
  {
    id: "quote",
    t: 0.62,
    edge: "left",
    y: "54%",
    rotate: -2.5,
    scale: 0.9,
    kind: "quote",
    faceKey: "mapFaceQuote",
    faceSubKey: "mapFaceQuoteSub",
  },
  {
    id: "activity",
    t: 0.74,
    edge: "right",
    y: "66%",
    rotate: 5,
    scale: 0.98,
    kind: "activity",
    faceKey: "mapFaceAct",
    faceSubKey: "mapFaceActSub",
  },
  {
    id: "finish",
    t: 0.9,
    edge: "left",
    y: "80%",
    rotate: -4,
    scale: 1.04,
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
      const p = Math.min(1, (now - t0) / 1100);
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
  const roadRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState("start");
  const [statsOn, setStatsOn] = useState(false);
  const [branches, setBranches] = useState<{ d: string; on: boolean }[]>([]);

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
      const road = roadRef.current;
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
      const drawLen = reduced ? len : p * len;
      if (draw) {
        draw.style.strokeDasharray = `${len}`;
        draw.style.strokeDashoffset = `${len - drawLen}`;
      }
      if (road) {
        road.style.strokeDasharray = `${len}`;
        road.style.strokeDashoffset = `${len - drawLen}`;
      }

      const pt = path.getPointAtLength(Math.min(1, Math.max(0, p)) * len);
      marker?.setAttribute("cx", String(pt.x));
      marker?.setAttribute("cy", String(pt.y));
      core?.setAttribute("cx", String(pt.x));
      core?.setAttribute("cy", String(pt.y));

      let best = SPOTS[0];
      let bestD = Infinity;
      for (const c of SPOTS) {
        const d = Math.abs(c.t - p);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      setActiveId(best.id);

      const statsIdx = SPOTS.findIndex((c) => c.id === "stats");
      const statsCard = cardRefs.current[statsIdx];
      if (statsCard) {
        const r = statsCard.getBoundingClientRect();
        if (r.top < view * 0.85 && r.bottom > 0) setStatsOn(true);
      }

      const mapW = map.clientWidth;
      const mapH = map.clientHeight;
      setBranches(
        SPOTS.map((card, i) => {
          const el = cardRefs.current[i];
          if (!el) return { d: "", on: false };
          const er = el.getBoundingClientRect();
          const mr = map.getBoundingClientRect();
          const cx = ((er.left + er.width / 2 - mr.left) / mapW) * 1000;
          const cy = ((er.top + er.height / 2 - mr.top) / mapH) * 3000;
          const along = path.getPointAtLength(card.t * len);
          const midX = (along.x + cx) / 2 + (card.edge === "left" ? -50 : 50);
          const midY = (along.y + cy) / 2;
          return {
            d: `M ${along.x} ${along.y} Q ${midX} ${midY} ${cx} ${cy}`,
            on: p >= card.t - 0.05,
          };
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

  return (
    <div className="home-chaos">
      <div className="home-chaos-bg" aria-hidden>
        <div className="home-chaos-topo" />
        <div className="home-chaos-noise" />
        <span className="home-chaos-orb a" />
        <span className="home-chaos-orb b" />
        <span className="home-chaos-orb c" />
        <div className="home-chaos-grid" />
      </div>

      <div className="home-chaos-map" ref={mapRef}>
        <svg className="home-chaos-svg" viewBox="0 0 1000 3000" preserveAspectRatio="none" aria-hidden>
          <g className="home-chaos-contours" opacity="0.2">
            <ellipse cx="180" cy="380" rx="150" ry="85" fill="none" stroke="currentColor" strokeDasharray="4 8" />
            <ellipse cx="820" cy="860" rx="130" ry="95" fill="none" stroke="currentColor" strokeDasharray="4 8" />
            <ellipse cx="250" cy="1550" rx="170" ry="100" fill="none" stroke="currentColor" strokeDasharray="5 9" />
            <ellipse cx="760" cy="2100" rx="140" ry="75" fill="none" stroke="currentColor" strokeDasharray="4 8" />
            <ellipse cx="380" cy="2650" rx="190" ry="110" fill="none" stroke="currentColor" strokeDasharray="5 10" />
          </g>
          {/* дорожка: широкая основа + пунктир */}
          <path className="home-chaos-road-bed" d={TRACK_D} fill="none" />
          <path ref={pathRef} className="home-chaos-path-base" d={TRACK_D} fill="none" />
          <path ref={roadRef} className="home-chaos-road-glow" d={TRACK_D} fill="none" />
          <path ref={drawRef} className="home-chaos-path-draw" d={TRACK_D} fill="none" />
          {branches.map((b, i) =>
            b.d ? (
              <path key={SPOTS[i].id} className={`home-chaos-branch ${b.on ? "is-on" : ""}`} d={b.d} fill="none" />
            ) : null,
          )}
          <circle ref={markerRef} className="home-chaos-marker" cx={520} cy={20} r={15} />
          <circle ref={coreRef} className="home-chaos-marker-core" cx={520} cy={20} r={5} />
        </svg>

        {SPOTS.map((spot, i) => (
          <div key={spot.id} className={`home-chaos-row home-chaos-row-${spot.edge}`} style={{ top: spot.y }}>
            {/* текст напротив карточки */}
            <aside
              className={`home-chaos-face ${progress >= spot.t - 0.06 ? "is-visible" : ""} ${
                activeId === spot.id ? "is-active" : ""
              }`}
              style={{ ["--rot" as string]: `${-spot.rotate * 0.6}deg` }}
            >
              <p className="home-chaos-face-title">{t(`landing.${spot.faceKey}`)}</p>
              {spot.faceSubKey && (
                <p className="home-chaos-face-sub">{t(`landing.${spot.faceSubKey}`)}</p>
              )}
            </aside>

            <article
              ref={(n) => {
                cardRefs.current[i] = n;
              }}
              className={`home-chaos-card home-chaos-card-${spot.kind} ${
                progress >= spot.t - 0.06 ? "is-visible" : ""
              } ${activeId === spot.id ? "is-active" : ""}`}
              style={{
                ["--rot" as string]: `${spot.rotate}deg`,
                ["--scale" as string]: String(spot.scale),
              }}
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

              {spot.kind === "quote" && (
                <>
                  <p className="home-chaos-quote">«{t("landing.manifesto")}»</p>
                  <p className="home-chaos-note">{t("landing.manifestoLead")}</p>
                </>
              )}

              {spot.kind === "activity" && (
                <>
                  <p className="home-chaos-kicker">{t("landing.maprunWpActivity")}</p>
                  <h2>{t("landing.maprunActTitle")}</h2>
                  <div className="home-chaos-rings">
                    {[
                      { label: t("landing.maprunRing1"), p: 72 },
                      { label: t("landing.maprunRing2"), p: 45 },
                      { label: t("landing.maprunRing3"), p: 88 },
                    ].map((r) => (
                      <div key={r.label} className="home-chaos-ring" style={{ ["--p" as string]: String(r.p) }}>
                        <span>{r.p}%</span>
                        <strong>{r.label}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {spot.kind === "finish" && (
                <>
                  <p className="home-chaos-kicker">{t("landing.maprunWpFinish")}</p>
                  <h2>{t("landing.maprunFinishTitle")}</h2>
                  <p className="home-chaos-note">{t("landing.maprunFinishLead")}</p>
                  <div className="home-chaos-tape" aria-hidden>
                    <span>{t("landing.maprunTape")}</span>
                  </div>
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
