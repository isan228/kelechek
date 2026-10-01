import type { CSSProperties, ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";

type Pair = { v: string; l: string };
type Item = { t: string; d: string };
type Note = { t: string; s: string };
type Story = { q: string; n: string; m: string };
type Faq = { q: string; a: string };

const C = {
  g: "#3ddc97",
  b: "#6f9bff",
  o: "#ffb84d",
  p: "#ff6fae",
};
const RING_COLORS = [C.g, C.b, C.o, C.p];
const TONES = [C.g, C.b, C.o, C.p];
const CHIP_TONES = [C.g, C.o, C.p];
const STORY_TONES = [C.g, C.b, C.p];

type IconName =
  | "streak"
  | "coach"
  | "pin"
  | "cap"
  | "doc"
  | "bell"
  | "shield"
  | "receipt"
  | "check"
  | "chart"
  | "clock";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const p = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "streak":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <path d="M12 3v4" />
        </svg>
      );
    case "coach":
      return (
        <svg {...p}>
          <circle cx="12" cy="7.5" r="3.5" />
          <path d="M5 20c1.2-3.6 3.8-5.5 7-5.5s5.8 1.9 7 5.5" />
        </svg>
      );
    case "pin":
      return (
        <svg {...p}>
          <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      );
    case "cap":
      return (
        <svg {...p}>
          <path d="M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5Z" />
          <path d="M6.5 11.6V16c1.8 1.6 9.2 1.6 11 0v-4.4" />
        </svg>
      );
    case "doc":
      return (
        <svg {...p}>
          <path d="M7 3h7l4 4v14H7V3Z" />
          <path d="M14 3v4h4M10 12h5M10 16h5" />
        </svg>
      );
    case "bell":
      return (
        <svg {...p}>
          <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
          <path d="M10 20.5a2 2 0 0 0 4 0" />
        </svg>
      );
    case "shield":
      return (
        <svg {...p}>
          <path d="M12 3 5 6v5.5c0 4.4 3 7.8 7 9.5 4-1.7 7-5.1 7-9.5V6l-7-3Z" />
          <path d="m9 12 2.2 2.2L15.5 10" />
        </svg>
      );
    case "receipt":
      return (
        <svg {...p}>
          <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
          <path d="M9 8h6M9 12h6" />
        </svg>
      );
    case "check":
      return (
        <svg {...p}>
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      );
    case "chart":
      return (
        <svg {...p}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case "clock":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
  }
}

function Rings({ values, size }: { values: number[]; size: number }) {
  const w = 16;
  const gap = 6;
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" role="img" aria-label="4 years">
      {values.map((pct, i) => {
        const r = 110 - w / 2 - 2 - i * (w + gap);
        const len = 2 * Math.PI * r;
        return (
          <g key={i}>
            <circle cx="110" cy="110" r={r} fill="none" stroke="#262d3b" strokeWidth={w} />
            {pct > 0 && (
              <circle
                className="hm-ring"
                cx="110"
                cy="110"
                r={r}
                fill="none"
                stroke={RING_COLORS[i]}
                strokeWidth={w}
                strokeLinecap="round"
                strokeDasharray={`${(len * pct) / 100} ${len}`}
                style={{ "--L": len } as CSSProperties}
                transform="rotate(-90 110 110)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Badge({ icon, tone, small }: { icon: IconName; tone: string; small?: boolean }) {
  return (
    <span className={`hm-badge ${small ? "hm-badge-sm" : ""}`} style={{ "--c": tone } as CSSProperties}>
      <Icon name={icon} size={small ? 18 : 22} />
    </span>
  );
}

function Head({ eye, title, center }: { eye: string; title: string; center?: boolean }) {
  return (
    <div className={`hm-hd ${center ? "hm-hd-center" : ""}`}>
      <span className="hm-eye">{eye}</span>
      <h2>{title}</h2>
    </div>
  );
}

function Section({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`hm-sec ${className ?? ""}`}>
      <div className="hm-w">{children}</div>
    </section>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const ctaTo = user ? "/memberships" : "/login";
  const checkTo = user ? "/app" : "/login";

  if (
    user?.roles.includes("ACCOUNTANT") &&
    !user.roles.includes("ADMIN") &&
    !user.roles.includes("COACH") &&
    !user.roles.includes("TRAINEE")
  ) {
    return <Navigate to="/accounting" replace />;
  }

  const k = (key: string) => t(`homeLanding.${key}`);
  const list = <T,>(key: string) => t(`homeLanding.${key}`, { returnObjects: true }) as unknown as T[];

  const facts = list<Pair>("facts");
  const chips = list<string>("chips");
  const strip = list<Pair>("strip");
  const steps = list<Item>("steps");
  const features = list<Item>("features");
  const parents = list<Item>("parents");
  const notes = list<Note>("notes");
  const stories = list<Story>("stories");
  const faq = list<Faq>("faq");

  const featureIcons: IconName[] = ["streak", "coach", "pin", "cap"];
  const parentIcons: IconName[] = ["doc", "bell", "shield", "receipt"];
  const noteIcons: IconName[] = ["check", "chart", "clock"];
  const chipIcons: IconName[] = ["streak", "coach", "cap"];

  return (
    <div className="hm">
      <section className="hm-hero">
        <div className="hm-blob hm-blob-a" aria-hidden />
        <div className="hm-blob hm-blob-b" aria-hidden />
        <div className="hm-w hm-hero-grid">
          <div className="hm-hero-copy">
            <span className="hm-pill">{k("pill")}</span>
            <h1>
              {k("titleA")}
              <span className="hm-gt">{k("titleB")}</span>
              {k("titleC")}
            </h1>
            <p className="hm-lead">{k("lead")}</p>
            <div className="hm-cta">
              <Link to={ctaTo} className="hm-btn">
                {k("cta")}
              </Link>
              <a href="#how" className="hm-btn hm-btn-ghost">
                {k("ctaGhost")}
              </a>
            </div>
            <div className="hm-facts">
              {facts.map((f) => (
                <div key={f.l}>
                  <b>{f.v}</b>
                  {f.l}
                </div>
              ))}
            </div>
          </div>

          <div className="hm-phone-wrap">
            <div className="hm-phone">
              <small>{k("phoneTop")}</small>
              <div className="hm-phone-rings">
                <Rings values={[100, 68, 0, 0]} size={190} />
                <div className="hm-phone-ctr">
                  <small>{k("phoneRefund")}</small>
                  <b>{k("phoneAmount")}</b>
                </div>
              </div>
              <Link to={checkTo} className="hm-btn hm-btn-block">
                {k("phoneBtn")}
              </Link>
            </div>
            {chips.map((c, i) => (
              <div key={c} className={`hm-chip hm-chip-${i + 1}`} style={{ "--c": CHIP_TONES[i] } as CSSProperties}>
                <Icon name={chipIcons[i]} size={16} />
                {c}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="hm-strip">
        <div className="hm-w hm-strip-grid">
          {strip.map((s) => (
            <div key={s.l}>
              <b>{s.v}</b>
              <span>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      <Section id="how">
        <Head eye={k("howEye")} title={k("howTitle")} />
        <div className="hm-steps">
          {steps.map((s, i) => (
            <div key={s.t} className="hm-card hm-step" style={{ "--c": TONES[i] } as CSSProperties}>
              <span className="hm-step-n">{i + 1}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="features" className="hm-sec-tight">
        <Head eye={k("featEye")} title={k("featTitle")} />
        <div className="hm-bento">
          {features.map((f, i) => (
            <div key={f.t} className="hm-card hm-tile" style={{ "--c": TONES[i] } as CSSProperties}>
              <Badge icon={featureIcons[i]} tone={TONES[i]} />
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </Section>

      <section id="parents" className="hm-sec hm-par">
        <div className="hm-w hm-par-grid">
          <div>
            <Head eye={k("parEye")} title={k("parTitle")} />
            <div className="hm-par-list">
              {parents.map((p, i) => (
                <div key={p.t}>
                  <Badge icon={parentIcons[i]} tone={TONES[i]} />
                  <p>
                    <b>{p.t}</b>
                    <span>{p.d}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="hm-notes" aria-label={k("notesLabel")}>
            <small>{k("notesLabel")}</small>
            {notes.map((n, i) => (
              <div key={n.t}>
                <Badge icon={noteIcons[i]} tone={TONES[i]} small />
                <p>
                  <b>{n.t}</b>
                  <small>{n.s}</small>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Section id="stories">
        <Head eye={k("storEye")} title={k("storTitle")} />
        <div className="hm-stories">
          {stories.map((s, i) => (
            <figure key={s.n} className="hm-card hm-tile" style={{ "--c": STORY_TONES[i] } as CSSProperties}>
              <blockquote>{s.q}</blockquote>
              <figcaption>
                <i>{s.n.charAt(0)}</i>
                <span>
                  {s.n}
                  <small>{s.m}</small>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section id="faq" className="hm-sec-tight">
        <Head eye={k("faqEye")} title={k("faqTitle")} center />
        <div className="hm-faq">
          {faq.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <div className="hm-band">
          <div>
            <h2>{k("bandTitle")}</h2>
            <p>{k("bandSub")}</p>
          </div>
          <Link to={ctaTo} className="hm-btn hm-btn-light">
            {k("cta")}
          </Link>
        </div>
      </Section>
    </div>
  );
}
