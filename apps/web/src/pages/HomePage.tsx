import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

function formatSom(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "ky" ? "ky-KG" : "ru-KG", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ky" ? "ky-KG" : "ru-KG", {
    dateStyle: "medium",
    timeZone: "Asia/Bishkek",
  }).format(new Date(iso));
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.balance>> | null>(null);
  const isTrainee = Boolean(user?.roles.includes("TRAINEE"));

  useEffect(() => {
    if (isTrainee) void api.balance().then(setData).catch(() => setData(null));
  }, [isTrainee]);

  const name = user?.firstName ?? "";
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const endExclusive = data?.membership?.endsAtExclusive;
  const lastDay = endExclusive
    ? new Date(new Date(endExclusive).getTime() - 1000).toISOString()
    : null;

  if (loading) return null;

  if (!user) {
    return (
      <section className="card hero">
        <p className="badge">{t("landing.kicker")}</p>
        <h1 className="serif">{t("landing.title")}</h1>
        <p className="lead">{t("landing.lead")}</p>
        <ul className="points">
          <li>{t("landing.point1")}</li>
          <li>{t("landing.point2")}</li>
          <li>{t("landing.point3")}</li>
        </ul>
        <div className="row">
          <Link to="/login">
            <button type="button">{t("nav.login")}</button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <p className="muted">{name ? `${t("home.greeting")}, ${name}` : t("home.greeting")}</p>
      {isTrainee && (
        <>
          <div className="muted">{t("home.accumulated")}</div>
          <div className="hero-sum serif">
            {t("home.som", { value: formatSom(data?.balance.available ?? 0, locale) })}
          </div>
          <p>{data && data.streak > 0 ? t("home.streak", { count: data.streak }) : t("home.streakZero")}</p>
          <p className="muted">
            {lastDay
              ? t("home.membershipActive", { date: formatDate(lastDay, locale) })
              : t("home.membershipNone")}
          </p>
          <p>{t("home.goalLead")}</p>
          <Link to="/pay">
            <button type="button">{lastDay ? t("home.extendCta") : t("home.payCta")}</button>
          </Link>
        </>
      )}
      {user.roles.includes("COACH") && !isTrainee && (
        <p>
          <Link to="/coach">{t("nav.coach")}</Link>
        </p>
      )}
    </section>
  );
}
