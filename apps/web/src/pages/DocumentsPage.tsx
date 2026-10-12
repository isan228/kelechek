import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Reveal } from "../components/Reveal";
import { PageHero } from "../components/PageHero";

type Step = { t: string; d: string };

export function DocumentsPage() {
  const { t } = useTranslation();
  const body = t("statement.body", { returnObjects: true }) as unknown as string[];
  const steps = t("statement.steps", { returnObjects: true }) as unknown as Step[];

  return (
    <>
      <PageHero
        kicker={t("statement.kicker")}
        title={t("statement.title")}
        lead={t("statement.lead")}
      />

      {/*
        Публичная оферта размещается на этой странице ВЫШЕ обращения, когда будет
        утверждена юристом: сначала текст оферты, затем настоящее обращение.
      */}

      <section className="band">
        <div className="wrap">
          {body.map((paragraph, i) => (
            <Reveal key={paragraph.slice(0, 32)} delay={i * 50}>
              <p className={i === 0 ? "lead" : "muted"}>{paragraph}</p>
            </Reveal>
          ))}
          <Reveal delay={body.length * 50}>
            <p className="kicker">{t("statement.signature")}</p>
          </Reveal>
        </div>
      </section>

      <section className="band band-soft">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <p className="kicker">{t("statement.stepsKicker")}</p>
              <h2>{t("statement.stepsTitle")}</h2>
            </div>
          </Reveal>
          <div className="grid">
            {steps.map((step, i) => (
              <Reveal key={step.t} delay={i * 60} variant="up">
                <article className="story-block">
                  <em className="kicker">0{i + 1}</em>
                  <h3>{step.t}</h3>
                  <p className="muted">{step.d}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="cta-row">
            <Link to="/login">
              <button type="button">{t("statement.cta")}</button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
