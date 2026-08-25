import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const COACHES = [
  {
    key: "a",
    img: "https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=800&q=80",
  },
  {
    key: "b",
    img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
  },
  {
    key: "c",
    img: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
  },
];

export function CoachesPublicPage() {
  const { t } = useTranslation();
  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <p className="kicker">{t("nav.coaches")}</p>
          <h1>{t("coaches.title")}</h1>
          <p className="lead">{t("coaches.lead")}</p>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap grid three">
          {COACHES.map((c) => (
            <article className="card photo coach-card" key={c.key}>
              <img src={c.img} alt="" />
              <div className="pad">
                <h3>{t(`coaches.${c.key}n`)}</h3>
                <p className="muted">{t(`coaches.${c.key}`)}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="wrap" style={{ marginTop: "1.5rem" }}>
          <Link to="/login">
            <button type="button">{t("coaches.cta")}</button>
          </Link>
        </div>
      </section>
    </>
  );
}
