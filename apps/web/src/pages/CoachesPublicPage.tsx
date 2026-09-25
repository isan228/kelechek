import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";
import { PageHero } from "../components/PageHero";

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
      <PageHero kicker={t("nav.coaches")} title={s("coaches.title")} lead={s("coaches.lead")} />
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
              <Reveal key={n} delay={n * 50}>
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
        <div className="wrap">
          <div className="grid three">
            {coaches.map((c, i) => (
              <Reveal key={c.id} delay={(i % 3) * 60}>
                <article className="coach-card">
                  <img src={c.photoUrl || fallbacks[i % fallbacks.length]} alt="" />
                  <div className="coach-card-body">
                    <h3>{[c.firstName, c.lastName].filter(Boolean).join(" ") || s("coaches.unnamed")}</h3>
                    {c.sport ? <span className="badge">{c.sport}</span> : null}
                    <p className="muted">{c.bio || s("coaches.cardLead")}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          {coaches.length === 0 && <p className="muted">{s("coaches.empty")}</p>}
          <div className="cta-row" style={{ marginTop: "1.8rem" }}>
            <Link to="/login">
              <button type="button">{s("coaches.cta")}</button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
