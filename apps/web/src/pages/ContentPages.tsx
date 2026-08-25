import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";

export function ContentListPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.content>> | null>(null);

  useEffect(() => {
    void api.content().then(setData);
  }, []);

  return (
    <section>
      <h1>{t("content.title")}</h1>
      {data && !data.canReadBody && <p className="muted">{t("content.locked")}</p>}
      <div className="grid two">
        {data?.items.map((item) => (
          <article key={item.id} className={`card ${item.bodyAvailable ? "" : "locked"}`}>
            <span className="badge">{item.type}</span>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <Link to={`/content/${item.id}`}>{t("content.open")}</Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ContentItemPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [item, setItem] = useState<Awaited<ReturnType<typeof api.contentItem>> | null>(null);

  useEffect(() => {
    if (id) void api.contentItem(id).then(setItem);
  }, [id]);

  if (!item) return null;

  return (
    <article className="card">
      <h1>{item.title}</h1>
      <p className="muted">{t("disclaimer")}</p>
      {item.type === "EXERCISE" && <p>{t("content.exerciseWarning")}</p>}
      {item.bodyAvailable ? (
        <>
          <div className="rich" dangerouslySetInnerHTML={{ __html: item.bodyRich ?? "" }} />
          {item.contraindications && (
            <p>
              <strong>{t("content.contraindications")}:</strong> {item.contraindications}
            </p>
          )}
        </>
      ) : (
        <p>
          {t("content.payToRead")} — <Link to="/pay">{t("home.payCta")}</Link>
        </p>
      )}
    </article>
  );
}
