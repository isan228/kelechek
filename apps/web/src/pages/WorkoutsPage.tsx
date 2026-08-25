import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

const COVER: Record<string, string> = {
  ARTICLE:
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80",
  EXERCISE:
    "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=80",
  PROGRAM:
    "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
};

export function WorkoutsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [data, setData] = useState<Awaited<ReturnType<typeof api.content>> | null>(null);

  useEffect(() => {
    void api.content(locale).then(setData).catch(() => setData({ canReadBody: false, items: [] }));
  }, [locale]);

  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <p className="kicker">{t("nav.workouts")}</p>
          <h1>{t("content.title")}</h1>
          <p className="lead">{data && !data.canReadBody ? t("content.locked") : t("content.openLead")}</p>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap grid three">
          {data?.items.map((item) => (
            <article className="card photo" key={item.id}>
              <img src={COVER[item.type] ?? COVER.ARTICLE} alt="" />
              <div className="pad">
                <span className="badge">{item.type}</span>
                <h3>{item.title}</h3>
                <p className="muted">{item.summary}</p>
                <Link to={`/workouts/${item.id}`}>{t("content.open")}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

export function WorkoutItemPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const { id } = useParams();
  const [item, setItem] = useState<Awaited<ReturnType<typeof api.contentItem>> | null>(null);

  useEffect(() => {
    if (id) void api.contentItem(id, locale).then(setItem);
  }, [id, locale]);

  if (!item) return null;

  return (
    <div className="wrap section">
      <article className="card">
        <p className="kicker">{item.type}</p>
        <h1>{item.title}</h1>
        <p className="muted">{t("disclaimer")}</p>
        {item.type === "EXERCISE" && <p>{t("content.exerciseWarning")}</p>}
        {item.bodyAvailable ? (
          <>
            <div className="rich" dangerouslySetInnerHTML={{ __html: item.bodyRich ?? "" }} />
            {item.contraindications && (
              <p>
                <strong>{t("content.contraindications")}:</strong> {item.contraindications}
              </p>
            )}
          </>
        ) : (
          <p>
            {t("content.payToRead")} —{" "}
            <Link to={user ? "/memberships" : "/login"}>{t("home.payCta")}</Link>
          </p>
        )}
      </article>
    </div>
  );
}
