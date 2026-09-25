import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { INVEST_ASSETS } from "../app/investData";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

const TRACK_D =
  "M 480 40 " +
  "C 620 120, 780 180, 720 320 " +
  "S 280 420, 220 560 " +
  "S 760 680, 820 820 " +
  "S 180 980, 260 1120 " +
  "S 880 1240, 780 1400 " +
  "S 140 1520, 200 1680 " +
  "S 860 1820, 720 1980 " +
  "S 240 2140, 320 2300 " +
  "S 780 2460, 640 2620 " +
  "S 300 2780, 420 2940 " +
  "S 560 3080, 500 3160";

type CardLayout = {
  id: string;
  t: number;
  x: string;
  y: string;
  rotate: number;
  scale: number;
  side: "left" | "right" | "cross";
  kind: "start" | "invest" | "how" | "stats" | "activity" | "finish" | "quote" | "chip";
  chip?: string;
};

/** Плотнее по вертикали — меньше пустоты */
const LAYOUT: CardLayout[] = [
  { id: "start", t: 0.03, x: "5%", y: "1.5%", rotate: -2.5, scale: 1.06, side: "left", kind: "start" },
  { id: "chip1", t: 0.1, x: "62%", y: "7%", rotate: 6, scale: 0.78, side: "right", kind: "chip", chip: "live" },
  { id: "invest", t: 0.16, x: "48%", y: "10%", rotate: 3.5, scale: 1, side: "right", kind: "invest" },
  { id: "how", t: 0.28, x: "3%", y: "22%", rotate: -4, scale: 0.94, side: "left", kind: "how" },
  { id: "chip2", t: 0.36, x: "58%", y: "30%", rotate: -7, scale: 0.75, side: "right", kind: "chip", chip: "series" },
  { id: "stats", t: 0.42, x: "42%", y: "34%", rotate: 2, scale: 1.08, side: "cross", kind: "stats" },
  { id: "quote", t: 0.52, x: "4%", y: "46%", rotate: -3, scale: 0.88, side: "left", kind: "quote" },
  { id: "chip3", t: 0.58, x: "55%", y: "52%", rotate: 5, scale: 0.72, side: "right", kind: "chip", chip: "balance" },
  { id: "activity", t: 0.64, x: "46%", y: "56%", rotate: 4, scale: 0.96, side: "right", kind: "activity" },
  { id: "finish", t: 0.82, x: "12%", y: "72%", rotate: -3.5, scale: 1.04, side: "cross", kind: "finish" },
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

      const pt = path.getPointAtLength(Math.min(1, Math.max(0, p)) * len);
      if (marker) {
        marker.setAttribute("cx", String(pt.x));
        marker.setAttribute("cy", String(pt.y));
      }
      if (core) {
        core.setAttribute("cx", String(pt.x));
        core.setAttribute("cy", String(pt.y));
      }

      let best = LAYOUT[0];
      let bestD = Infinity;
      for (const c of LAYOUT) {
        if (c.kind === "chip") continue;
        const d = Math.abs(c.t - p);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      setActiveId(best.id);

      const statsIdx = LAYOUT.findIndex((c) => c.id === "stats");
      const statsCard = cardRefs.current[statsIdx];
      if (statsCard) {
        const r = statsCard.getBoundingClientRect();
        if (r.top < view * 0.85 && r.bottom > 0) setStatsOn(true);
      }

      const mapW = map.clientWidth;
      const mapH = map.clientHeight;
      setBranches(
        LAYOUT.map((card, i) => {
          const el = cardRefs.current[i];
          if (!el || card.kind === "chip") return { d: "", on: false };
          const er = el.getBoundingClientRect();
          const mr = map.getBoundingClientRect();
          const cx = ((er.left + er.width / 2 - mr.left) / mapW) * 1000;
          const cy = ((er.top + er.height / 2 - mr.top) / mapH) * 3200;
          const along = path.getPointAtLength(card.t * len);
          const midX = (along.x + cx) / 2 + (card.side === "left" ? -36 : 36);
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

  function goCard(i: number) {
    cardRefs.current[i]?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

  const chipText = (key?: string) => {
    if (key === "live") return t("landing.maprunWpStats");
    if (key === "series") return t("landing.maprunRing2");
    if (key === "balance") return t("landing.maprunStat1");
    return "";
  };

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
        <svg className="home-chaos-svg" viewBox="0 0 1000 3200" preserveAspectRatio="none" aria-hidden>
          {/* contour / map texture */}
          <g className="home-chaos-contours" opacity="0.22">
            <ellipse cx="200" cy="400" rx="160" ry="90" fill="none" stroke="currentColor" strokeDasharray="4 8" />
            <ellipse cx="200" cy="400" rx="110" ry="55" fill="none" stroke="currentColor" strokeDasharray="3 7" />
            <ellipse cx="780" cy="900" rx="140" ry="100" fill="none" stroke="currentColor" strokeDasharray="4 8" />
            <ellipse cx="780" cy="900" rx="90" ry="60" fill="none" stroke="currentColor" strokeDasharray="3 7" />
            <ellipse cx="300" cy="1600" rx="180" ry="110" fill="none" stroke="currentColor" strokeDasharray="5 9" />
            <ellipse cx="700" cy="2100" rx="150" ry="80" fill="none" stroke="currentColor" strokeDasharray="4 8" />
            <ellipse cx="400" cy="2700" rx="200" ry="120" fill="none" stroke="currentColor" strokeDasharray="5 10" />
            <circle cx="150" cy="1200" r="40" fill="none" stroke="currentColor" strokeDasharray="2 6" />
            <circle cx="850" cy="500" r="55" fill="none" stroke="currentColor" strokeDasharray="3 7" />
            <circle cx="120" cy="2400" r="70" fill="none" stroke="currentColor" strokeDasharray="3 8" />
          </g>
          <path ref={pathRef} className="home-chaos-path-base" d={TRACK_D} fill="none" />
          <path ref={drawRef} className="home-chaos-path-draw" d={TRACK_D} fill="none" />
          {branches.map((b, i) =>
            b.d ? (
              <path key={LAYOUT[i].id} className={`home-chaos-branch ${b.on ? "is-on" : ""}`} d={b.d} fill="none" />
            ) : null,
          )}
          <circle ref={markerRef} className="home-chaos-marker" cx={480} cy={40} r={16} />
          <circle ref={coreRef} className="home-chaos-marker-core" cx={480} cy={40} r={5} />
        </svg>

        {LAYOUT.map((card, i) => (
          <article
            key={card.id}
            ref={(n) => {
              cardRefs.current[i] = n;
            }}
            className={`home-chaos-card home-chaos-card-${card.kind} home-chaos-card-${card.side} ${
              progress >= card.t - 0.06 ? "is-visible" : ""
            } ${activeId === card.id ? "is-active" : ""}`}
            style={{
              left: card.x,
              top: card.y,
              ["--rot" as string]: `${card.rotate}deg`,
              ["--scale" as string]: String(card.scale),
            }}
          >
            {card.kind === "start" && (
              <>
                <p className="home-chaos-kicker">{t("landing.maprunWpStart")}</p>
                <h1>{s("appName")}</h1>
                <p className="home-chaos-hook">{t("landing.maprunHook")}</p>
                <p className="home-chaos-note">{t("landing.maprunSub")}</p>
                <div className="home-chaos-actions">
                  <Link to={startTo} className="home-chaos-btn">
                    {s("landing.ctaStart")}
                  </Link>
                  <button type="button" className="home-chaos-btn-ghost" onClick={() => goCard(2)}>
                    {t("landing.maprunScroll")}
                  </button>
                </div>
              </>
            )}

            {card.kind === "chip" && (
              <p className="home-chaos-chip-label">{chipText(card.chip)}</p>
            )}

            {card.kind === "invest" && (
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

            {card.kind === "how" && (
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

            {card.kind === "stats" && (
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

            {card.kind === "quote" && (
              <>
                <p className="home-chaos-quote">«{t("landing.manifesto")}»</p>
                <p className="home-chaos-note">{t("landing.manifestoLead")}</p>
              </>
            )}

            {card.kind === "activity" && (
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

            {card.kind === "finish" && (
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
        ))}
      </div>
    </div>
  );
}
