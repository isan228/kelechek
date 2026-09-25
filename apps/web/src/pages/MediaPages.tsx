import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { Reveal } from "../components/Reveal";
import { PageHero } from "../components/PageHero";

export function GalleryPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [items, setItems] = useState<Awaited<ReturnType<typeof api.gallery>>["items"]>([]);

  useEffect(() => {
    void api.gallery().then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);

  return (
    <>
      <PageHero kicker={t("nav.gallery")} title={t("gallery.title")} lead={t("gallery.lead")} />
      <section className="band" style={{ paddingTop: "1.5rem" }}>
        <div className="wrap">
          {items.length === 0 ? (
            <Reveal>
              <p className="manifesto">
                <em>{t("gallery.emptyTitle")}</em>
              </p>
              <p className="lead" style={{ marginTop: "1rem" }}>
                {t("gallery.emptyLead")}
              </p>
            </Reveal>
          ) : (
            <div className="story-grid">
              {items.map((item, i) => {
                const caption = locale === "ky" ? item.captionKy || item.captionRu : item.captionRu || item.captionKy;
                return (
                  <Reveal key={item.id} delay={(i % 6) * 40} variant="up">
                    <article className="feature-panel">
                      <p className="kicker">0{String(i + 1).padStart(1, "0")}</p>
                      <h3>{caption || t("gallery.untitled")}</h3>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export function NewsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof api.news>>["posts"]>([]);

  useEffect(() => {
    void api.news(locale).then((r) => setPosts(r.posts)).catch(() => setPosts([]));
  }, [locale]);

  return (
    <>
      <PageHero kicker={t("nav.news")} title={t("news.title")} lead={t("news.lead")} />
      <section className="band" style={{ paddingTop: "1.5rem" }}>
        <div className="wrap">
          {posts.length === 0 && <p className="muted">{t("news.empty")}</p>}
          <div className="news-grid">
            {posts.map((post, i) => (
              <Reveal key={post.id} delay={i * 50} variant="up">
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
        </div>
      </section>
    </>
  );
}

export function NewsItemPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [post, setPost] = useState<Awaited<ReturnType<typeof api.newsPost>>["post"] | null>(null);

  useEffect(() => {
    if (!id) return;
    void api
      .newsPost(id, locale)
      .then((r) => setPost(r.post))
      .catch(() => setPost(null));
  }, [id, locale]);

  if (!post) {
    return (
      <div className="wrap app-page">
        <p className="muted">{t("news.notFound")}</p>
        <Link to="/news">{t("news.back")}</Link>
      </div>
    );
  }

  return (
    <>
      <PageHero kicker={t("nav.news")} title={post.title} lead={post.summary} />
      <section className="band" style={{ paddingTop: "1rem" }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <p className="muted" style={{ marginTop: 0 }}>
            {new Date(post.publishedAt).toLocaleDateString(locale === "ky" ? "ky-KG" : "ru-KG")}
          </p>
          <div className="lead news-body">{post.body}</div>
          <div className="cta-row">
            <Link to="/news">
              <button className="ghost" type="button">
                {t("news.back")}
              </button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
