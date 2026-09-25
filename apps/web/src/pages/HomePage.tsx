import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

/** Основной хаотичный трек */
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

/** Параллельные дорожки — сходятся/расходятся */
const TRACK_ALT_A =
  "M 520 55 " +
  "C 780 120, 900 230, 860 360 " +
  "C 800 520, 150 500, 120 700 " +
  "C 90 900, 860 850, 900 1040 " +
  "C 940 1230, 200 1200, 160 1420 " +
  "C 120 1640, 820 1600, 860 1820 " +
  "C 910 2040, 240 2000, 200 2220 " +
  "C 160 2440, 740 2400, 780 2620 " +
  "C 830 2840, 380 2800, 340 3000 " +
  "C 310 3100, 460 3160, 540 3175";

const TRACK_ALT_B =
  "M 440 60 " +
  "C 760 70, 970 190, 900 330 " +
  "C 820 500, 40 470, 30 670 " +
  "C 20 870, 930 800, 970 1010 " +
  "C 1010 1220, 90 1170, 50 1390 " +
  "C 10 1610, 890 1570, 930 1790 " +
  "C 980 2010, 130 1970, 90 2190 " +
  "C 50 2410, 810 2370, 850 2590 " +
  "C 900 2810, 270 2770, 230 2970 " +
  "C 200 3070, 390 3130, 470 3150";

type Edge = "left" | "right";
type Kind = "start" | "streak" | "coach" | "gyms" | "uni" | "finish";

type Spot = {
  id: string;
  n: number;
  t: number;
  edge: Edge;
  y: string;
  kind: Kind;
  faceKey: string;
  faceSubKey: string;
};

const SPOTS: Spot[] = [
  {
    id: "start",
    n: 1,
    t: 0.03,
    edge: "right",
    y: "1%",
    kind: "start",
    faceKey: "journeyFaceStart",
    faceSubKey: "journeyFaceStartSub",
  },
  {
    id: "streak",
    n: 2,
    t: 0.2,
    edge: "left",
    y: "14%",
    kind: "streak",
    faceKey: "journeyFaceStreak",
    faceSubKey: "journeyFaceStreakSub",
  },
  {
    id: "coach",
    n: 3,
    t: 0.38,
    edge: "right",
    y: "30%",
    kind: "coach",
    faceKey: "journeyFaceCoach",
    faceSubKey: "journeyFaceCoachSub",
  },
  {
    id: "gyms",
    n: 4,
    t: 0.55,
    edge: "left",
    y: "46%",
    kind: "gyms",
    faceKey: "journeyFaceGyms",
    faceSubKey: "journeyFaceGymsSub",
  },
  {
    id: "uni",
    n: 5,
    t: 0.72,
    edge: "right",
    y: "62%",
    kind: "uni",
    faceKey: "journeyFaceUni",
    faceSubKey: "journeyFaceUniSub",
  },
  {
    id: "finish",
    n: 6,
    t: 0.92,
    edge: "left",
    y: "78%",
    kind: "finish",
    faceKey: "journeyFaceFinish",
    faceSubKey: "journeyFaceFinishSub",
  },
];

const COACHES = [
  { id: "c1", specKey: "journeyCoachSpec1", nameKey: "journeyCoach1", years: 8 },
  { id: "c2", specKey: "journeyCoachSpec2", nameKey: "journeyCoach2", years: 5 },
  { id: "c3", specKey: "journeyCoachSpec3", nameKey: "journeyCoach3", years: 11 },
];

const KICKER: Record<Kind, string> = {
  start: "journeyWpStart",
  streak: "journeyWpStreak",
  coach: "journeyWpCoach",
  gyms: "journeyWpGyms",
  uni: "journeyWpUni",
  finish: "journeyWpFinish",
};

const GYMS = [
  { id: "g1", nameKey: "journeyGym1", dist: "1.2 км" },
  { id: "g2", nameKey: "journeyGym2", dist: "2.4 км" },
  { id: "g3", nameKey: "journeyGym3", dist: "3.1 км" },
  { id: "g4", nameKey: "journeyGym4", dist: "4.0 км" },
];

function StageIcon({ kind }: { kind: Kind }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" as const, "aria-hidden": true };
  switch (kind) {
    case "start":
      return (
        <svg {...common}>
          <path d="M5 19V5l14 7-14 7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "streak":
      return (
        <svg {...common}>
          <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" stroke="currentColor" strokeWidth="1.7" />
          <path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case "coach":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
          <path d="M5 19c1.5-3.2 4-4.8 7-4.8S17.5 15.8 19 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "gyms":
      return (
        <svg {...common}>
          <path d="M3 10h3v4H3zM18 10h3v4h-3zM6 12h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M9 8v8M15 8v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "uni":
      return (
        <svg {...common}>
          <path d="M3 10l9-5 9 5-9 5-9-5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M7 12.5V17c2 1.5 8 1.5 10 0v-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M5 12l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

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
  const solidRef = useRef<SVGPathElement>(null);
  const markerRef = useRef<SVGCircleElement>(null);
  const coreRef = useRef<SVGCircleElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState("start");
  const [finished, setFinished] = useState(false);
  const [coachIdx, setCoachIdx] = useState(0);
  const [branches, setBranches] = useState<{ d: string }[]>([]);
  const [nodes, setNodes] = useState<{ x: number; y: number }[]>(() => SPOTS.map(() => ({ x: 500, y: 100 })));

  useEffect(() => {
    let raf = 0;
    function update() {
      const map = mapRef.current;
      const path = pathRef.current;
      const draw = drawRef.current;
      const glow = glowRef.current;
      const solid = solidRef.current;
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
      const applyReveal = (el: SVGPathElement | null) => {
        if (!el) return;
        if (reduced) {
          el.style.strokeDasharray = "none";
          el.style.strokeDashoffset = "0";
        } else {
          el.style.strokeDasharray = String(len);
          el.style.strokeDashoffset = String(len * (1 - p));
        }
      };
      // сплошной контур и база — всегда по всему пути; пунктир+свечение — по скроллу
      if (solid) {
        solid.style.strokeDasharray = "none";
        solid.style.strokeDashoffset = "0";
      }
      applyReveal(draw);
      applyReveal(glow);

      if (marker && core) {
        const pt = path.getPointAtLength(len * (reduced ? 1 : p));
        marker.setAttribute("cx", String(pt.x));
        marker.setAttribute("cy", String(pt.y));
        core.setAttribute("cx", String(pt.x));
        core.setAttribute("cy", String(pt.y));
      }

      const nextNodes = SPOTS.map((spot) => {
        const pt = path.getPointAtLength(len * spot.t);
        return { x: pt.x, y: pt.y };
      });
      setNodes(nextNodes);

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

      const vbW = 1000;
      const vbH = 3200;
      const mapW = map.offsetWidth || 1;
      const mapH = map.offsetHeight || 1;
      setBranches(
        SPOTS.map((spot, i) => {
          const el = cardRefs.current[i];
          if (!el) return { d: "" };
          const r = el.getBoundingClientRect();
          const mr = map.getBoundingClientRect();
          const edgeX =
            spot.edge === "left"
              ? ((r.right - mr.left) / mapW) * vbW
              : ((r.left - mr.left) / mapW) * vbW;
          const cy = ((r.top + r.height * 0.35 - mr.top) / mapH) * vbH;
          const pt = nextNodes[i];
          const mx = (pt.x + edgeX) / 2;
          const my = (pt.y + cy) / 2 + (spot.edge === "right" ? -20 : 20);
          return { d: `M ${pt.x} ${pt.y} Q ${mx} ${my} ${edgeX} ${cy}` };
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
    <div className={`home-journey ${finished ? "is-finished" : ""}`}>
      <div className="home-journey-bg" aria-hidden>
        <div className="home-journey-bg-grid" />
        <div className="home-journey-bg-topo" />
        <span className="home-journey-blob a" />
        <span className="home-journey-blob b" />
        <span className="home-journey-blob c" />
        <svg className="home-journey-bg-svg" viewBox="0 0 1000 3200" preserveAspectRatio="none">
          <ellipse cx="160" cy="420" rx="220" ry="140" className="home-journey-geo" />
          <ellipse cx="860" cy="1100" rx="200" ry="160" className="home-journey-geo" />
          <ellipse cx="200" cy="1900" rx="240" ry="130" className="home-journey-geo" />
          <ellipse cx="780" cy="2700" rx="210" ry="150" className="home-journey-geo" />
          <path
            className="home-journey-lane"
            d="M80 200 C 200 400, 120 700, 280 900 C 420 1080, 180 1300, 300 1600"
            fill="none"
          />
          <path
            className="home-journey-lane"
            d="M900 300 C 780 550, 920 800, 760 1100 C 620 1360, 880 1600, 720 1900"
            fill="none"
          />
          <circle cx="500" cy="1600" r="380" className="home-journey-track-ring" />
          <circle cx="500" cy="1600" r="300" className="home-journey-track-ring" />
          <circle cx="500" cy="1600" r="220" className="home-journey-track-ring" />
        </svg>
      </div>

      <div className="home-journey-sticky" role="banner">
        <div className="home-journey-sticky-inner">
          <Link to="/" className="home-journey-sticky-brand">
            {s("appName")}
          </Link>
          <Link to={ctaTo} className="home-journey-sticky-cta">
            {t("landing.journeyCta")}
          </Link>
        </div>
      </div>

      <div className="home-journey-map" ref={mapRef}>
        <svg className="home-journey-svg" viewBox="0 0 1000 3200" preserveAspectRatio="none" aria-hidden>
          {/* параллельные дорожки */}
          <path className="home-journey-alt home-journey-alt-a" d={TRACK_ALT_A} fill="none" />
          <path className="home-journey-alt home-journey-alt-b" d={TRACK_ALT_B} fill="none" />

          {/* двойной контур основного маршрута */}
          <path className="home-journey-bed" d={TRACK_D} fill="none" />
          <path ref={pathRef} className="home-journey-base" d={TRACK_D} fill="none" />
          <path ref={solidRef} className="home-journey-solid" d={TRACK_D} fill="none" />
          <path ref={glowRef} className="home-journey-glow" d={TRACK_D} fill="none" />
          <path ref={drawRef} className="home-journey-draw" d={TRACK_D} fill="none" />

          {branches.map((b, i) =>
            b.d ? <path key={`br-${SPOTS[i].id}`} className="home-journey-branch" d={b.d} fill="none" /> : null,
          )}

          {/* узлы-чекпоинты на линии */}
          {SPOTS.map((spot, i) => (
            <g
              key={`node-${spot.id}`}
              className={`home-journey-node ${progress >= spot.t - 0.04 || reduced ? "is-on" : ""} ${
                activeId === spot.id ? "is-active" : ""
              }`}
              transform={`translate(${nodes[i]?.x ?? 500}, ${nodes[i]?.y ?? 100})`}
            >
              <circle className="home-journey-node-halo" r={28} />
              <circle className="home-journey-node-ring" r={20} />
              <circle className="home-journey-node-fill" r={16} />
              <g className="home-journey-node-ico" transform="translate(-9,-9)">
                <StageIcon kind={spot.kind} />
              </g>
            </g>
          ))}

          <circle
            ref={markerRef}
            className={`home-journey-marker ${finished ? "is-done" : ""}`}
            cx={480}
            cy={40}
            r={10}
          />
          <circle ref={coreRef} className="home-journey-core" cx={480} cy={40} r={4} />
        </svg>

        {SPOTS.map((spot, i) => (
          <div
            key={spot.id}
            className={`home-journey-row home-journey-row-${spot.edge} is-visible ${
              activeId === spot.id ? "is-active" : ""
            }`}
          >
            <aside className="home-journey-face">
              <p className="home-journey-face-n">{String(spot.n).padStart(2, "0")}</p>
              <p className="home-journey-face-title">{t(`landing.${spot.faceKey}`)}</p>
              <p className="home-journey-face-sub">{t(`landing.${spot.faceSubKey}`)}</p>
            </aside>

            <article
              ref={(n) => {
                cardRefs.current[i] = n;
              }}
              className={`home-journey-card home-journey-card-${spot.kind}`}
            >
              <span className="home-journey-num" aria-hidden>
                {spot.n}
              </span>

              <div className="home-journey-card-head">
                <span className="home-journey-card-ico">
                  <StageIcon kind={spot.kind} />
                </span>
                <p className="home-journey-kicker">{t(`landing.${KICKER[spot.kind]}`)}</p>
              </div>

              {spot.kind === "start" && (
                <>
                  <h1>{s("appName")}</h1>
                  <p className="home-journey-hook">{t("landing.journeyHook")}</p>
                  <p className="home-journey-note">{t("landing.journeySub")}</p>
                  <div className="home-journey-mini">
                    <div>
                      <b>1</b>
                      <span>{t("landing.journeyWpStreak")}</span>
                    </div>
                    <div>
                      <b>4</b>
                      <span>{t("landing.journeyYear")}</span>
                    </div>
                    <div>
                      <b>100%</b>
                      <span>{t("landing.journeyRefundValue")}</span>
                    </div>
                  </div>
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
                  <h2>{t("landing.journeyStreakTitle")}</h2>
                  <p className="home-journey-note">{t("landing.journeyStreakLead")}</p>
                  <div className="home-journey-streak" aria-label={t("landing.journeyStreakTitle")}>
                    {[1, 2, 3, 4].map((y) => (
                      <div
                        key={y}
                        className={`home-journey-ring ${y === 4 ? "is-refund" : ""}`}
                        style={{ ["--p" as string]: String(y <= 2 ? 100 : y === 3 ? 55 : 0) }}
                      >
                        <span>
                          {y === 4 ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path d="M4 8h16v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" stroke="currentColor" strokeWidth="1.8" />
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
                  <div className="home-journey-bars" aria-hidden>
                    {[72, 88, 55, 18].map((h, idx) => (
                      <i key={idx} style={{ height: `${h}%` }} />
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
                  <p className="home-journey-meta">{t("landing.journeyCoachMeta", { count: COACHES.length })}</p>
                </>
              )}

              {spot.kind === "gyms" && (
                <>
                  <h2>{t("landing.journeyGymsTitle")}</h2>
                  <p className="home-journey-note">{t("landing.journeyGymsLead")}</p>
                  <p className="home-journey-big">
                    24<span>{t("landing.journeyGymsCount")}</span>
                  </p>
                  <div className="home-journey-map-mini" aria-hidden>
                    <span style={{ left: "18%", top: "30%" }} />
                    <span style={{ left: "55%", top: "22%" }} />
                    <span style={{ left: "40%", top: "58%" }} />
                    <span style={{ left: "72%", top: "48%" }} />
                  </div>
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
                  <h2>{t("landing.journeyUniTitle")}</h2>
                  <p className="home-journey-note">{t("landing.journeyUniLead")}</p>
                  <div className="home-journey-uni-stats">
                    <div>
                      <b>12+</b>
                      <span>{t("landing.journeyUniStat1")}</span>
                    </div>
                    <div>
                      <b>3</b>
                      <span>{t("landing.journeyUniStat2")}</span>
                    </div>
                  </div>
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
                  <h2>{t("landing.journeyFinishTitle")}</h2>
                  <p className="home-journey-note">{t("landing.journeyFinishLead")}</p>
                  <div className={`home-journey-finish-mark ${finished || reduced ? "is-on" : ""}`} aria-hidden>
                    <span>✓</span>
                  </div>
                  <ul className="home-journey-finish-list">
                    <li>{t("landing.journeyFinishBullet1")}</li>
                    <li>{t("landing.journeyFinishBullet2")}</li>
                    <li>{t("landing.journeyFinishBullet3")}</li>
                  </ul>
                  <Link to={ctaTo} className="home-journey-btn home-journey-btn-lg">
                    {t("landing.journeyCta")}
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
