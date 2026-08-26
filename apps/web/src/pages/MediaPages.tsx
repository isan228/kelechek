import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";

export function GalleryPage() {
  const { t, i18n } = useTranslation();
  const { photo } = useSiteCopy();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [items, setItems] = useState<Awaited<ReturnType<typeof api.gallery>>["items"]>([]);

  useEffect(() => {
    void api.gallery().then((r) => setItems(r.items)).catch(() => setItems([]));
  }, []);

  const fallbacks = [photo("movement"), photo("discipline"), photo("honor"), photo("youth"), photo("goals"), photo("medal")];
  const list =
    items.length > 0
      ? items.map((g) => ({
          id: g.id,
          src: g.imageUrl,
          caption: locale === "ky" ? g.captionKy || g.captionRu : g.captionRu || g.captionKy,
        }))
      : fallbacks.map((src, i) => ({ id: String(i), src, caption: "" }));

  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <p className="kicker">{t("nav.gallery")}</p>
          <h1>{t("gallery.title")}</h1>
          <p className="lead">{t("gallery.lead")}</p>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="gallery-masonry">
            {list.map((item, i) => (
              <Reveal key={item.id} delay={(i % 6) * 50}>
                <figure>
                  <img src={item.src} alt={item.caption || ""} />
                  {item.caption ? <figcaption>{item.caption}</figcaption> : null}
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export function NewsPage() {
  const { t, i18n } = useTranslation();
  const { photo } = useSiteCopy();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof api.news>>["posts"]>([]);

  useEffect(() => {
    void api.news(locale).then((r) => setPosts(r.posts)).catch(() => setPosts([]));
  }, [locale]);

  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <p className="kicker">{t("nav.news")}</p>
          <h1>{t("news.title")}</h1>
          <p className="lead">{t("news.lead")}</p>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          {posts.length === 0 && <p className="muted">{t("news.empty")}</p>}
          <div className="news-grid">
            {posts.map((post, i) => (
              <Reveal key={post.id} delay={i * 60}>
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
        </div>
      </section>
    </>
  );
}

export function NewsItemPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { photo } = useSiteCopy();
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
      <div className="wrap section">
        <p className="muted">{t("news.notFound")}</p>
        <Link to="/news">{t("news.back")}</Link>
      </div>
    );
  }

  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <p className="kicker">{t("nav.news")}</p>
          <h1>{post.title}</h1>
          <p className="muted">
            {new Date(post.publishedAt).toLocaleDateString(locale === "ky" ? "ky-KG" : "ru-KG")}
          </p>
          <p className="lead">{post.summary}</p>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <img
            src={post.coverUrl || photo("city")}
            alt=""
            style={{ width: "100%", borderRadius: 18, marginBottom: "1.4rem", aspectRatio: "16/9", objectFit: "cover" }}
          />
          <div className="lead" style={{ whiteSpace: "pre-wrap" }}>
            {post.body}
          </div>
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
