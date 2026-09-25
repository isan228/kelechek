import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { s } = useSiteCopy();
  const { user } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const startTo = user ? "/app" : "/login";
  const [news, setNews] = useState<Awaited<ReturnType<typeof api.news>>["posts"]>([]);

  useEffect(() => {
    void api.news(locale).then((r) => setNews(r.posts.slice(0, 4))).catch(() => setNews([]));
  }, [locale]);

  if (
    user?.roles.includes("ACCOUNTANT") &&
    !user.roles.includes("ADMIN") &&
    !user.roles.includes("COACH") &&
    !user.roles.includes("TRAINEE")
  ) {
    return <Navigate to="/accounting" replace />;
  }

  const marquee = [
    t("landing.marquee1"),
    t("landing.marquee2"),
    t("landing.marquee3"),
    t("landing.marquee4"),
    t("landing.marquee5"),
    t("landing.marquee6"),
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-stage" aria-hidden>
          <div className="hero-grid" />
          <div className="hero-orb hero-orb-a" />
          <div className="hero-orb hero-orb-b" />
          <div className="hero-ring" />
        </div>
        <div className="hero-inner">
          <p className="hero-brand">
            <span>{s("appName")}</span>
          </p>
          <h1>{s("landing.title")}</h1>
          <p className="lead">{s("landing.lead")}</p>
          <div className="cta-row">
            <Link to={startTo}>
              <button type="button">{s("landing.ctaStart")}</button>
            </Link>
            <Link to="/about">
              <button className="ghost" type="button">
                {s("landing.ctaAbout")}
              </button>
            </Link>
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden>
        <div className="marquee-track">
          {[...marquee, ...marquee, ...marquee, ...marquee].map((word, i) => (
            <span key={`${word}-${i}`}>{word}</span>
          ))}
        </div>
      </div>

      <div className="wrap">
        <div className="stats">
          <div className="stat">
            <b>{t("landing.statValue1")}</b>
            <span>{s("landing.stat1")}</span>
          </div>
          <div className="stat">
            <b>
              {t("landing.statValue2")} {s("landing.days")}
            </b>
            <span>{s("landing.stat2")}</span>
          </div>
          <div className="stat">
            <b>
              {t("landing.statValue3")} {s("landing.months")}
            </b>
            <span>{s("landing.stat3")}</span>
          </div>
        </div>
      </div>

      <section className="band">
        <div className="wrap split">
          <Reveal variant="left">
            <p className="manifesto">
              {t("landing.manifesto").split("—").map((part, i, arr) =>
                i === 0 ? (
                  <span key={i}>
                    <em>{part.trim()}</em>
                    {arr.length > 1 ? " — " : ""}
                  </span>
                ) : (
                  <span key={i}>{part.trim()}</span>
                ),
              )}
            </p>
          </Reveal>
          <Reveal variant="right" delay={100}>
            <p className="lead">{t("landing.manifestoLead")}</p>
          </Reveal>
        </div>
      </section>

      <section className="band band-soft">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <p className="kicker">{s("landing.pathKicker")}</p>
              <h2>{s("landing.pathTitle")}</h2>
              <p className="muted">{t("landing.pathLead")}</p>
            </div>
          </Reveal>
          <div className="path">
            {[1, 2, 3, 4].map((n) => (
              <Reveal key={n} delay={n * 70} variant="up">
                <article className="path-step">
                  <em>0{n}</em>
                  <h3>{s(`landing.step${n}t`)}</h3>
                  <p className="muted">{s(`landing.step${n}`)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <p className="kicker">{s("landing.whyKicker")}</p>
              <h2>{s("landing.whyTitle")}</h2>
              <p className="muted">{s("landing.whyLead")}</p>
            </div>
          </Reveal>
          <div className="rule-compare">
            <Reveal variant="left">
              <article>
                <p className="kicker">{t("landing.card1b")}</p>
                <h3>{t("landing.soloTitle")}</h3>
                <ul>
                  <li>{t("landing.solo1")}</li>
                  <li>{t("landing.solo2")}</li>
                  <li>{t("landing.solo3")}</li>
                </ul>
              </article>
            </Reveal>
            <Reveal variant="right" delay={90}>
              <article>
                <p className="kicker">{t("landing.card2b")}</p>
                <h3>{t("landing.coachTitle")}</h3>
                <ul>
                  <li>{t("landing.coach1")}</li>
                  <li>{t("landing.coach2")}</li>
                  <li>{t("landing.coach3")}</li>
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="band band-deep">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <p className="kicker">{t("landing.promiseKicker")}</p>
              <h2>{t("landing.promiseTitle")}</h2>
            </div>
          </Reveal>
          <div className="story-grid">
            {[1, 2, 3].map((n) => (
              <Reveal key={n} delay={n * 80} variant="scale">
                <article className="story-block">
                  <p className="kicker">0{n}</p>
                  <h3>{t(`landing.promise${n}t`)}</h3>
                  <p className="muted">{t(`landing.promise${n}`)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <p className="kicker">{t("nav.news")}</p>
              <h2>{t("news.homeTitle")}</h2>
              <p className="muted">{t("news.homeLead")}</p>
            </div>
          </Reveal>
          {news.length > 0 ? (
            <div className="news-grid">
              {news.map((post, i) => (
                <Reveal key={post.id} delay={i * 60} variant="up">
                  <Link to={`/news/${post.id}`} className="news-card">
                    <div className="muted">
                      {new Date(post.publishedAt).toLocaleDateString(locale === "ky" ? "ky-KG" : "ru-KG")}
                    </div>
                    <h3>{post.title}</h3>
                    <p className="muted">{post.summary}</p>
                  </Link>
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="muted">{t("news.emptyHome")}</p>
          )}
          <Link className="section-link" to="/news">
            {t("news.openAll")} →
          </Link>
        </div>
      </section>

      <section className="band band-soft">
        <div className="wrap">
          <Reveal variant="blur">
            <div className="section-head">
              <p className="kicker">{s("landing.kicker")}</p>
              <h2>{t("landing.closingTitle")}</h2>
              <p className="muted">{t("landing.closingLead")}</p>
            </div>
          </Reveal>
          <div className="cta-row">
            <Link to={startTo}>
              <button type="button">{s("landing.ctaStart")}</button>
            </Link>
            <Link to="/coaches">
              <button className="ghost" type="button">
                {t("nav.coaches")}
              </button>
            </Link>
            <Link to="/memberships">
              <button className="ghost" type="button">
                {t("nav.memberships")}
              </button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
