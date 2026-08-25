import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { photos } from "../photos";

export function HomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const startTo = user ? "/memberships" : "/login";

  return (
    <>
      <section className="hero">
        <div className="hero-media">
          <img src={photos.hero} alt="" />
        </div>
        <img className="hero-ornament" src="/ornament.svg" alt="" />
        <div className="hero-inner">
          <p className="kicker">{t("landing.kicker")}</p>
          <h1>{t("landing.title")}</h1>
          <p className="lead">{t("landing.lead")}</p>
          <div className="cta-row">
            <Link to={startTo}>
              <button type="button">{t("landing.ctaStart")}</button>
            </Link>
            <Link to="/about">
              <button className="ghost" type="button">
                {t("landing.ctaAbout")}
              </button>
            </Link>
          </div>
        </div>
      </section>
      <div className="wrap">
        <div className="stats">
          <div className="stat">
            <b>82%</b>
            <span>{t("landing.stat1")}</span>
          </div>
          <div className="stat">
            <b>30 {t("landing.days")}</b>
            <span>{t("landing.stat2")}</span>
          </div>
          <div className="stat">
            <b>12 {t("landing.months")}</b>
            <span>{t("landing.stat3")}</span>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="kicker">{t("landing.pathKicker")}</p>
            <h2>{t("landing.pathTitle")}</h2>
          </div>
          <div className="path">
            {[1, 2, 3, 4].map((n) => (
              <article className="path-step" key={n}>
                <em>0{n}</em>
                <h3>{t(`landing.step${n}t`)}</h3>
                <p className="muted">{t(`landing.step${n}`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap split">
          <div>
            <p className="kicker">{t("landing.whyKicker")}</p>
            <h2>{t("landing.whyTitle")}</h2>
            <p className="lead">{t("landing.whyLead")}</p>
            <div className="cta-row">
              <Link to="/workouts">
                <button type="button">{t("nav.workouts")}</button>
              </Link>
            </div>
          </div>
          <img src={photos.movement} alt="" />
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="grid two">
            <article className="card photo">
              <img src={photos.goals} alt="" />
              <div className="pad">
                <span className="badge">{t("landing.card1b")}</span>
                <h3>{t("landing.card1t")}</h3>
                <p className="muted">{t("landing.card1")}</p>
              </div>
            </article>
            <article className="card photo">
              <img src={photos.discipline} alt="" />
              <div className="pad">
                <span className="badge">{t("landing.card2b")}</span>
                <h3>{t("landing.card2t")}</h3>
                <p className="muted">{t("landing.card2")}</p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
