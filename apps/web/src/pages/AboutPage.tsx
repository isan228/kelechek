import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const IMG =
  "https://images.unsplash.com/photo-1552674605-db8be97f5d23?auto=format&fit=crop&w=1400&q=80";

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
          <img src={IMG} alt="" />
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
