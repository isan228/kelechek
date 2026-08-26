import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { photos } from "../photos";
import { api } from "../api/client";
import { useSiteCopy } from "../content/SiteCopyProvider";

const FALLBACK_PHOTOS = [photos.honor, photos.discipline, photos.youth];

export function CoachesPublicPage() {
  const { t, i18n } = useTranslation();
  const { s } = useSiteCopy();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [coaches, setCoaches] = useState<
    { id: string; firstName: string | null; lastName: string | null; bio: string | null; photoUrl: string | null }[]
  >([]);

  useEffect(() => {
    void api
      .publicCoaches(locale)
      .then((r) => setCoaches(r.coaches))
      .catch(() => setCoaches([]));
  }, [locale]);

  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <p className="kicker">{t("nav.coaches")}</p>
          <h1>{s("coaches.title")}</h1>
          <p className="lead">{s("coaches.lead")}</p>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap grid three">
          {coaches.map((c, i) => (
            <article className="card photo coach-card" key={c.id}>
              <img src={c.photoUrl || FALLBACK_PHOTOS[i % FALLBACK_PHOTOS.length]} alt="" />
              <div className="pad">
                <h3>{[c.firstName, c.lastName].filter(Boolean).join(" ") || s("coaches.unnamed")}</h3>
                <p className="muted">{c.bio || s("coaches.cardLead")}</p>
              </div>
            </article>
          ))}
        </div>
        {coaches.length === 0 && (
          <div className="wrap">
            <p className="muted">{s("coaches.empty")}</p>
          </div>
        )}
        <div className="wrap" style={{ marginTop: "1.5rem" }}>
          <Link to="/login">
            <button type="button">{s("coaches.cta")}</button>
          </Link>
        </div>
      </section>
    </>
  );
}
