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
        <div className="hero-inner">
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
              <Reveal key={n} delay={n * 60}>
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
              <div className="cta-row">
                <Link to="/memberships">
                  <button type="button">{t("nav.memberships")}</button>
                </Link>
                <Link to="/workouts">
                  <button className="ghost" type="button">
                    {s("content.title")}
                  </button>
                </Link>
              </div>
            </div>
          </Reveal>
          <Reveal delay={100}>
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
              <p className="kicker">{t("nav.news")}</p>
              <h2>{t("news.homeTitle")}</h2>
              <p className="muted">{t("news.homeLead")}</p>
            </div>
          </Reveal>
          {news.length > 0 ? (
            <div className="news-grid">
              {news.map((post, i) => (
                <Reveal key={post.id} delay={i * 70}>
                  <Link to={`/news/${post.id}`} className="news-card">
                    <img src={post.coverUrl || photo("city")} alt="" />
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
          <Reveal>
            <div className="section-head">
              <p className="kicker">{s("landing.kicker")}</p>
              <h2>{s("landing.card1t")}</h2>
              <p className="muted">{s("landing.card1")}</p>
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
          </div>
        </div>
      </section>
    </>
  );
}
