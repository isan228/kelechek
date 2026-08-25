import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

function formatSom(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "ky" ? "ky-KG" : "ru-KG", { maximumFractionDigits: 0 }).format(value);
}

export function CabinetPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [data, setData] = useState<Awaited<ReturnType<typeof api.balance>> | null>(null);

  useEffect(() => {
    if (user?.roles.includes("TRAINEE")) {
      void api.balance().then(setData).catch(() => setData(null));
    }
  }, [user]);

  const holdPct = Math.min(
    100,
    Math.round(((data?.withdrawalProgress.monthsHeld ?? 0) / (data?.withdrawalProgress.holdingMonths ?? 12)) * 100),
  );

  return (
    <div className="wrap section">
      <p className="kicker">{t("nav.cabinet")}</p>
      <h1>
        {user?.firstName ? `${t("home.greeting")}, ${user.firstName}` : t("cabinet.title")}
      </h1>
      <div className="cabinet-grid">
        <article className="card">
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
          <h3>{t("cabinet.next")}</h3>
          <p className="muted">{t("cabinet.nextLead")}</p>
          <div className="cta-row">
            <Link to="/memberships">
              <button type="button">{t("nav.memberships")}</button>
            </Link>
            <Link to="/workouts">
              <button className="ghost" type="button">
                {t("nav.workouts")}
              </button>
            </Link>
            <Link to="/invites">
              <button className="ghost" type="button">
                {t("nav.invites")}
              </button>
            </Link>
            <Link to="/profile">
              <button className="ghost" type="button">
                {t("nav.profile")}
              </button>
            </Link>
          </div>
        </article>
      </div>
    </div>
  );
}

export function GoalPage() {
  const { t, i18n } = useTranslation();
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
    <div className="wrap section">
      <p className="kicker">{t("nav.goal")}</p>
      <h1>{t("goal.title")}</h1>
      <p className="lead">{t("goal.lead")}</p>
      <article className="card">
        <h3>{t("goal.bar")}</h3>
        <div className="progress-ring">
          <span style={{ width: `${pct}%` }} />
        </div>
        <p>
          {formatSom(have, locale)} / {formatSom(min, locale)} сом
        </p>
        <ul className="points">
          <li>{t("goal.r1")}</li>
          <li>{t("goal.r2")}</li>
          <li>{t("goal.r3")}</li>
        </ul>
      </article>
    </div>
  );
}
