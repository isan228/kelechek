import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

export function WorkoutsPage() {
  const { t, i18n } = useTranslation();
  const { s, photo } = useSiteCopy();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [data, setData] = useState<Awaited<ReturnType<typeof api.content>> | null>(null);
  const cover: Record<string, string> = {
    ARTICLE: photo("city"),
    EXERCISE: photo("movement"),
    PROGRAM: photo("medal"),
  };

  useEffect(() => {
    void api.content(locale).then(setData).catch(() => setData({ canReadBody: false, items: [] }));
  }, [locale]);

  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <p className="kicker">{t("nav.workouts")}</p>
          <h1>{s("content.title")}</h1>
          <p className="lead">{data && !data.canReadBody ? s("content.locked") : s("content.openLead")}</p>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap grid three">
          {data?.items.map((item) => (
            <article className="card photo" key={item.id}>
              <img src={cover[item.type] ?? cover.ARTICLE} alt="" />
              <div className="pad">
                <span className="badge">{item.type}</span>
                <h3>{item.title}</h3>
                <p className="muted">{item.summary}</p>
                <Link to={`/workouts/${item.id}`}>{s("content.open")}</Link>
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
  const { s } = useSiteCopy();
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
        <p className="muted">{s("disclaimer")}</p>
        {item.type === "EXERCISE" && <p>{s("content.exerciseWarning")}</p>}
        {item.bodyAvailable ? (
          <>
            <div className="rich" dangerouslySetInnerHTML={{ __html: item.bodyRich ?? "" }} />
            {item.contraindications && (
              <p>
                <strong>{s("content.contraindications")}:</strong> {item.contraindications}
              </p>
            )}
          </>
        ) : (
          <p>
            {s("content.payToRead")} —{" "}
            <Link to={user ? "/memberships" : "/login"}>{t("home.payCta")}</Link>
          </p>
        )}
      </article>
    </div>
  );
}
