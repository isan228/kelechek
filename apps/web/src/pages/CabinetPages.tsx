import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

function formatSom(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "ky" ? "ky-KG" : "ru-KG", { maximumFractionDigits: 0 }).format(value);
}

export function CabinetPage() {
  const { t, i18n } = useTranslation();
  const { s } = useSiteCopy();
  const { user } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [data, setData] = useState<Awaited<ReturnType<typeof api.balance>> | null>(null);

  useEffect(() => {
    if (user?.roles.includes("TRAINEE")) {
      void api.balance().then(setData).catch(() => setData(null));
    }
  }, [user]);

  if (
    user?.roles.includes("ACCOUNTANT") &&
    !user.roles.includes("ADMIN") &&
    !user.roles.includes("TRAINEE")
  ) {
    return <Navigate to="/accounting" replace />;
  }

  const holdPct = Math.min(
    100,
    Math.round(((data?.withdrawalProgress.monthsHeld ?? 0) / (data?.withdrawalProgress.holdingMonths ?? 12)) * 100),
  );

  return (
    <div className="wrap app-page">
      <p className="kicker">{t("nav.cabinet")}</p>
      <h1>
        {user?.firstName ? `${t("home.greeting")}, ${user.firstName}` : s("cabinet.title")}
      </h1>
      <p className="muted">{s("cabinet.nextLead")}</p>
      <div className="cabinet-grid">
        <article className="card cabinet-balance">
          <span className="badge">{t("home.accumulated")}</span>
          <div className="hero-sum serif">{formatSom(data?.balance.available ?? 0, locale)}</div>
          <p className="muted">{data && data.streak > 0 ? t("home.streak", { count: data.streak }) : t("home.streakZero")}</p>
          <div className="progress-ring" aria-hidden>
            <span style={{ width: `${holdPct}%` }} />
          </div>
          <p className="muted" style={{ marginTop: "0.7rem" }}>
            {t("balance.holding", {
              held: data?.withdrawalProgress.monthsHeld ?? 0,
              need: data?.withdrawalProgress.holdingMonths ?? 12,
            })}
          </p>
          <div className="cta-row">
            <Link to="/progress">
              <button type="button">{t("nav.progress")}</button>
            </Link>
            <Link to="/goal">
              <button className="ghost" type="button">
                {t("nav.goal")}
              </button>
            </Link>
          </div>
        </article>
        <article className="card">
          <h3>{s("cabinet.next")}</h3>
          <nav className="cabinet-nav" aria-label="cabinet">
            <Link to="/memberships">
              {t("nav.memberships")}
              <span>→</span>
            </Link>
            <Link to="/workouts">
              {t("nav.workouts")}
              <span>→</span>
            </Link>
            <Link to="/schedule">
              {t("nav.schedule")}
              <span>→</span>
            </Link>
            <Link to="/invites">
              {t("nav.invites")}
              <span>→</span>
            </Link>
            <Link to="/profile">
              {t("nav.profile")}
              <span>→</span>
            </Link>
            {user?.roles.includes("ADMIN") && (
              <Link to="/admin">
                {t("nav.admin")}
                <span>→</span>
              </Link>
            )}
          </nav>
        </article>
      </div>
    </div>
  );
}

export function GoalPage() {
  const { t, i18n } = useTranslation();
  const { s } = useSiteCopy();
  const { user } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [data, setData] = useState<Awaited<ReturnType<typeof api.balance>> | null>(null);

  useEffect(() => {
    if (user) void api.balance().then(setData).catch(() => setData(null));
  }, [user]);

  const min = data?.withdrawalProgress.minAmountKgs ?? 1000;
  const have = data?.balance.available ?? 0;
  const pct = Math.min(100, Math.round((have / min) * 100));

  return (
    <div className="wrap app-page">
      <p className="kicker">{t("nav.goal")}</p>
      <h1>{s("goal.title")}</h1>
      <p className="lead">{s("goal.lead")}</p>
      <article className="card" style={{ maxWidth: 640, marginTop: "1.5rem" }}>
        <div className="pad">
        <h3>{s("goal.bar")}</h3>
        <div className="progress-ring">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p>
          {formatSom(have, locale)} / {formatSom(min, locale)} сом
        </p>
        <ul className="points">
          <li>{s("goal.r1")}</li>
          <li>{s("goal.r2")}</li>
          <li>{s("goal.r3")}</li>
        </ul>
        </div>
      </article>
    </div>
  );
}
