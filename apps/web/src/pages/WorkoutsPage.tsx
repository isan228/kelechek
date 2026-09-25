import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";
import { PageHero } from "../components/PageHero";

export function WorkoutsPage() {
  const { t, i18n } = useTranslation();
  const { s } = useSiteCopy();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [data, setData] = useState<Awaited<ReturnType<typeof api.content>> | null>(null);

  useEffect(() => {
    void api.content(locale).then(setData).catch(() => setData({ canReadBody: false, items: [] }));
  }, [locale]);

  return (
    <>
      <PageHero
        kicker={t("nav.workouts")}
        title={s("content.title")}
        lead={data && !data.canReadBody ? s("content.locked") : s("content.openLead")}
      />
      <section className="band" style={{ paddingTop: "1.5rem" }}>
        <div className="wrap grid three">
          {data?.items.map((item, i) => (
            <Reveal key={item.id} delay={(i % 3) * 50} variant="up">
              <article className="card">
                <span className="badge">{item.type}</span>
                <h3>{item.title}</h3>
                <p className="muted">{item.summary}</p>
                <Link className="section-link" to={`/workouts/${item.id}`}>
                  {s("content.open")} →
                </Link>
              </article>
            </Reveal>
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
    <div className="wrap app-page">
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
