import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { INVEST_ASSETS } from "../app/investData";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

/** Органичный трейл: петли и зигзаги (viewBox 0 0 1000 3200) */
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
  n: number;
  t: number; // 0..1 along path for order
  x: string; // CSS left
  y: string; // CSS top of map canvas
  rotate: number;
  scale: number;
  side: "left" | "right" | "cross";
  kind: "start" | "invest" | "how" | "stats" | "activity" | "finish" | "quote";
};

const LAYOUT: CardLayout[] = [
  { id: "start", n: 1, t: 0.04, x: "8%", y: "2%", rotate: -3, scale: 1.08, side: "left", kind: "start" },
  { id: "invest", n: 2, t: 0.18, x: "52%", y: "11%", rotate: 4, scale: 1, side: "right", kind: "invest" },
  { id: "how", n: 3, t: 0.34, x: "4%", y: "24%", rotate: -5, scale: 0.92, side: "left", kind: "how" },
  { id: "stats", n: 4, t: 0.5, x: "48%", y: "38%", rotate: 2.5, scale: 1.12, side: "cross", kind: "stats" },
  { id: "quote", n: 0, t: 0.58, x: "6%", y: "52%", rotate: -2, scale: 0.85, side: "left", kind: "quote" },
  { id: "activity", n: 5, t: 0.72, x: "50%", y: "62%", rotate: 5, scale: 0.95, side: "right", kind: "activity" },
  { id: "finish", n: 6, t: 0.92, x: "18%", y: "78%", rotate: -4, scale: 1.05, side: "cross", kind: "finish" },
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
  const [activeN, setActiveN] = useState(1);
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

      const pt = path.getPointAtLength(Math.min(1, Math.max(0, reduced ? Math.min(p * 1.2, 1) : p)) * len);
      if (marker) {
        marker.setAttribute("cx", String(pt.x));
        marker.setAttribute("cy", String(pt.y));
      }
      if (core) {
        core.setAttribute("cx", String(pt.x));
        core.setAttribute("cy", String(pt.y));
      }

      // which checkpoint is nearest by t
      let best = LAYOUT[0];
      let bestD = Infinity;
      for (const c of LAYOUT) {
        if (c.n === 0) continue;
        const d = Math.abs(c.t - p);
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      setActiveN(best.n);

      const statsCard = cardRefs.current[LAYOUT.findIndex((c) => c.id === "stats")];
      if (statsCard) {
        const r = statsCard.getBoundingClientRect();
        if (r.top < view * 0.8 && r.bottom > 0) setStatsOn(true);
      }

      // branch lines from path to card centers (in SVG coords of viewBox)
      const mapW = map.clientWidth;
      const mapH = map.clientHeight;
      const nextBranches = LAYOUT.map((card, i) => {
        const el = cardRefs.current[i];
        if (!el) return { d: "", on: false };
        const er = el.getBoundingClientRect();
        const mr = map.getBoundingClientRect();
        const cx = ((er.left + er.width / 2 - mr.left) / mapW) * 1000;
        const cy = ((er.top + er.height / 2 - mr.top) / mapH) * 3200;
        const along = path.getPointAtLength(card.t * len);
        const midX = (along.x + cx) / 2 + (card.side === "left" ? -40 : 40);
        const midY = (along.y + cy) / 2;
        return {
          d: `M ${along.x} ${along.y} Q ${midX} ${midY} ${cx} ${cy}`,
          on: p >= card.t - 0.04,
        };
      });
      setBranches(nextBranches);

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

  const pct = Math.round(progress * 100);

  function goCard(i: number) {
    cardRefs.current[i]?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }

  return (
    <div className="home-chaos">
      <header className="home-chaos-bar">
        <div className="home-chaos-bar-inner wrap">
          <div className="home-chaos-bar-track" aria-hidden>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className="home-chaos-bar-meta">{t("landing.maprunProgress", { pct })}</p>
          <nav className="home-chaos-dots" aria-label="Чекпоинты">
            {LAYOUT.filter((c) => c.n > 0).map((c) => (
              <button
                key={c.id}
                type="button"
                className={`home-chaos-dot ${activeN === c.n ? "is-on" : ""} ${progress >= c.t ? "is-passed" : ""}`}
                onClick={() => goCard(LAYOUT.findIndex((x) => x.id === c.id))}
                aria-label={`${c.n}`}
              >
                {c.n}
              </button>
            ))}
          </nav>
          <Link to={startTo} className="home-chaos-bar-cta">
            {s("landing.ctaStart")}
          </Link>
        </div>
      </header>

      <div className="home-chaos-map" ref={mapRef}>
        <svg className="home-chaos-svg" viewBox="0 0 1000 3200" preserveAspectRatio="none" aria-hidden>
          <path ref={pathRef} className="home-chaos-path-base" d={TRACK_D} fill="none" />
          <path ref={drawRef} className="home-chaos-path-draw" d={TRACK_D} fill="none" />
          {branches.map((b, i) =>
            b.d ? (
              <path
                key={LAYOUT[i].id}
                className={`home-chaos-branch ${b.on ? "is-on" : ""}`}
                d={b.d}
                fill="none"
              />
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
            } ${activeN === card.n ? "is-active" : ""}`}
            style={{
              left: card.x,
              top: card.y,
              ["--rot" as string]: `${card.rotate}deg`,
              ["--scale" as string]: String(card.scale),
            }}
          >
            {card.n > 0 && <span className="home-chaos-num">{String(card.n).padStart(2, "0")}</span>}

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
                  <button type="button" className="home-chaos-btn-ghost" onClick={() => goCard(1)}>
                    {t("landing.maprunScroll")}
                  </button>
                </div>
              </>
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
