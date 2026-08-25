import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { photos } from "../photos";
import { api } from "../api/client";

const COACH_PHOTOS = [photos.honor, photos.discipline, photos.youth];

export function CoachesPublicPage() {
  const { t } = useTranslation();
  const [coaches, setCoaches] = useState<{ id: string; firstName: string | null; lastName: string | null }[]>([]);

  useEffect(() => {
    void api.publicCoaches().then((r) => setCoaches(r.coaches)).catch(() => setCoaches([]));
  }, []);

  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <p className="kicker">{t("nav.coaches")}</p>
          <h1>{t("coaches.title")}</h1>
          <p className="lead">{t("coaches.lead")}</p>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap grid three">
          {coaches.map((c, i) => (
            <article className="card photo coach-card" key={c.id}>
              <img src={COACH_PHOTOS[i % COACH_PHOTOS.length]} alt="" />
              <div className="pad">
                <h3>{[c.firstName, c.lastName].filter(Boolean).join(" ") || t("coaches.unnamed")}</h3>
                <p className="muted">{t("coaches.cardLead")}</p>
              </div>
            </article>
          ))}
        </div>
        {coaches.length === 0 && (
          <div className="wrap">
            <p className="muted">{t("coaches.empty")}</p>
          </div>
        )}
        <div className="wrap" style={{ marginTop: "1.5rem" }}>
          <Link to="/login">
            <button type="button">{t("coaches.cta")}</button>
          </Link>
        </div>
      </section>
    </>
  );
}
