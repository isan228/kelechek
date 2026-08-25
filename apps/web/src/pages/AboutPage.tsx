import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { photos } from "../photos";

export function AboutPage() {
  const { t } = useTranslation();
  return (
    <>
      <div className="page-hero">
        <div className="wrap">
          <p className="kicker">{t("nav.about")}</p>
          <h1>{t("about.title")}</h1>
          <p className="lead">{t("about.lead")}</p>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap split">
          <img src={photos.traditions} alt="" />
          <div>
            <h2>{t("about.ideaTitle")}</h2>
            <p className="lead">{t("about.idea")}</p>
            <p className="lead">{t("about.notCashback")}</p>
            <Link to="/memberships">
              <button type="button">{t("nav.memberships")}</button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
