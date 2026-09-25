import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";
import { PageHero } from "../components/PageHero";

export function AboutPage() {
  const { t } = useTranslation();
  const { s } = useSiteCopy();
  return (
    <>
      <PageHero kicker={t("nav.about")} title={s("about.title")} lead={s("about.lead")} />
      <section className="band">
        <div className="wrap split">
          <Reveal variant="left">
            <p className="manifesto">
              <em>{s("about.ideaTitle")}</em>
            </p>
          </Reveal>
          <Reveal variant="right" delay={80}>
            <div>
              <p className="lead">{s("about.idea")}</p>
              <p className="muted">{s("about.notCashback")}</p>
              <div className="cta-row">
                <Link to="/memberships">
                  <button type="button">{t("nav.memberships")}</button>
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      <section className="band band-soft">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <p className="kicker">{t("about.valuesKicker")}</p>
              <h2>{t("about.valuesTitle")}</h2>
              <p className="muted">{t("about.valuesLead")}</p>
            </div>
          </Reveal>
          <div className="story-grid">
            {[1, 2, 3].map((n) => (
              <Reveal key={n} delay={n * 70} variant="up">
                <article className="story-block">
                  <em className="kicker">0{n}</em>
                  <h3>{t(`about.value${n}t`)}</h3>
                  <p className="muted">{t(`about.value${n}`)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="band band-deep">
        <div className="wrap">
          <Reveal variant="blur">
            <div className="section-head">
              <p className="kicker">{t("about.nextKicker")}</p>
              <h2>{t("about.nextTitle")}</h2>
              <p className="muted">{t("about.nextLead")}</p>
            </div>
          </Reveal>
          <div className="cta-row">
            <Link to="/login">
              <button type="button">{t("landing.ctaStart")}</button>
            </Link>
            <Link to="/news">
              <button className="ghost" type="button">
                {t("nav.news")}
              </button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
