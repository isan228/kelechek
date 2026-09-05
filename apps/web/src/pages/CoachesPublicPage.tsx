import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";

export function CoachesPublicPage() {
  const { t, i18n } = useTranslation();
  const { s, photo } = useSiteCopy();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [coaches, setCoaches] = useState<
    { id: string; firstName: string | null; lastName: string | null; bio: string | null; sport: string | null; photoUrl: string | null }[]
  >([]);
  const fallbacks = [photo("honor"), photo("discipline"), photo("youth")];

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
      <section className="band band-soft">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <p className="kicker">{t("coaches.whyKicker")}</p>
              <h2>{t("coaches.whyTitle")}</h2>
              <p className="muted">{t("coaches.whyLead")}</p>
            </div>
          </Reveal>
          <div className="story-grid">
            {[1, 2, 3].map((n) => (
              <Reveal key={n} delay={n * 60}>
                <article className="story-block">
                  <h3>{t(`coaches.why${n}t`)}</h3>
                  <p className="muted">{t(`coaches.why${n}`)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="band">
        <div className="wrap grid three">
          {coaches.map((c, i) => (
            <Reveal key={c.id} delay={(i % 3) * 70}>
              <article className="coach-card">
                <img
                  src={c.photoUrl || fallbacks[i % fallbacks.length]}
                  alt=""
                  style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 16 }}
                />
                <div style={{ paddingTop: "0.85rem" }}>
                  <h3>{[c.firstName, c.lastName].filter(Boolean).join(" ") || s("coaches.unnamed")}</h3>
                  {c.sport && <span className="badge">{c.sport}</span>}
                  <p className="muted">{c.bio || s("coaches.cardLead")}</p>
                </div>
              </article>
            </Reveal>
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
