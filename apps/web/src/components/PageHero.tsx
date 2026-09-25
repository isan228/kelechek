import type { ReactNode } from "react";

type PageHeroProps = {
  kicker?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
  compact?: boolean;
};

export function PageHero({ kicker, title, lead, actions, compact }: PageHeroProps) {
  return (
    <header className={`page-hero ${compact ? "page-hero-compact" : ""}`}>
      <div className="wrap">
        {kicker ? <p className="kicker">{kicker}</p> : null}
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
        {actions ? <div className="cta-row">{actions}</div> : null}
      </div>
    </header>
  );
}
