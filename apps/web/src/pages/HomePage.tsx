import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { s, photo } = useSiteCopy();
  const { user } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const startTo = user ? "/memberships" : "/login";
  const [gallery, setGallery] = useState<Awaited<ReturnType<typeof api.gallery>>["items"]>([]);
  const [news, setNews] = useState<Awaited<ReturnType<typeof api.news>>["posts"]>([]);

  useEffect(() => {
    void api.gallery().then((r) => setGallery(r.items.slice(0, 8))).catch(() => setGallery([]));
    void api.news(locale).then((r) => setNews(r.posts.slice(0, 3))).catch(() => setNews([]));
  }, [locale]);

  if (
    user?.roles.includes("ACCOUNTANT") &&
    !user.roles.includes("ADMIN") &&
    !user.roles.includes("COACH") &&
    !user.roles.includes("TRAINEE")
  ) {
    return <Navigate to="/accounting" replace />;
  }

  const galleryFallback = [photo("movement"), photo("discipline"), photo("honor"), photo("youth"), photo("goals"), photo("medal")];

  return (
    <>
      <section className="hero">
        <div className="hero-media">
          <img src={photo("hero")} alt="" />
        </div>
        <img className="hero-ornament" src="/ornament.svg" alt="" />
        <div className="hero-inner">
          <p className="kicker">{s("landing.kicker")}</p>
          <p className="hero-brand">{s("appName")}</p>
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

      <div className="wrap">
        <div className="stats">
          <div className="stat">
            <b>{s("landing.statValue1")}</b>
            <span>{s("landing.stat1")}</span>
          </div>
          <div className="stat">
            <b>
              {s("landing.statValue2")} {s("landing.days")}
            </b>
            <span>{s("landing.stat2")}</span>
          </div>
          <div className="stat">
            <b>
              {s("landing.statValue3")} {s("landing.months")}
            </b>
            <span>{s("landing.stat3")}</span>
          </div>
        </div>
      </div>

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
              <Reveal key={n} delay={n * 70}>
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
        <div className="wrap split">
          <Reveal>
            <div>
              <p className="kicker">{s("landing.whyKicker")}</p>
              <h2>{s("landing.whyTitle")}</h2>
              <p className="lead">{s("landing.whyLead")}</p>
              <p className="muted">{t("landing.whyExtra")}</p>
              <div className="cta-row">
                <Link to="/workouts">
                  <button type="button">{s("content.title")}</button>
                </Link>
                <Link to="/memberships">
                  <button className="ghost" type="button">
                    {t("nav.memberships")}
                  </button>
                </Link>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <img src={photo("movement")} alt="" />
          </Reveal>
        </div>
      </section>

      <section className="band band-deep">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <p className="kicker">{t("nav.gallery")}</p>
              <h2>{t("gallery.homeTitle")}</h2>
              <p className="muted">{t("gallery.homeLead")}</p>
            </div>
          </Reveal>
          <div className="gallery-rail">
            {(gallery.length
              ? gallery.map((g) => ({
                  src: g.imageUrl,
                  caption: locale === "ky" ? g.captionKy || g.captionRu : g.captionRu || g.captionKy,
                }))
              : galleryFallback.map((src) => ({ src, caption: "" }))
            ).map((item, i) => (
              <Link to="/gallery" key={i}>
                <figure>
                  <img src={item.src} alt={item.caption || ""} />
                </figure>
              </Link>
            ))}
          </div>
          <Link className="section-link" to="/gallery">
            {t("gallery.openAll")} →
          </Link>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <p className="kicker">{t("landing.promiseKicker")}</p>
              <h2>{t("landing.promiseTitle")}</h2>
            </div>
          </Reveal>
          <div className="story-grid">
            {[1, 2, 3].map((n) => (
              <Reveal key={n} delay={n * 80}>
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

      <section className="band band-soft">
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
                <Reveal key={post.id} delay={i * 80}>
                  <Link to={`/news/${post.id}`} className="news-card">
                    {post.coverUrl ? <img src={post.coverUrl} alt="" /> : <img src={photo("city")} alt="" />}
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

      <section className="band">
        <div className="wrap">
          <div className="grid two">
            <Reveal>
              <article>
                <img src={photo("goals")} alt="" style={{ borderRadius: 18, marginBottom: "1rem" }} />
                <span className="badge">{s("landing.card1b")}</span>
                <h3>{s("landing.card1t")}</h3>
                <p className="muted">{s("landing.card1")}</p>
              </article>
            </Reveal>
            <Reveal delay={100}>
              <article>
                <img src={photo("discipline")} alt="" style={{ borderRadius: 18, marginBottom: "1rem" }} />
                <span className="badge">{s("landing.card2b")}</span>
                <h3>{s("landing.card2t")}</h3>
                <p className="muted">{s("landing.card2")}</p>
              </article>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
