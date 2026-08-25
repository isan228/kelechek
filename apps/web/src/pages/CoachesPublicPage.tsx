import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { photos } from "../photos";

const COACHES = [
  { key: "a", img: photos.honor },
  { key: "b", img: photos.discipline },
  { key: "c", img: photos.youth },
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
