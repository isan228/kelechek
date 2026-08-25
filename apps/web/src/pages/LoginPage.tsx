import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function LoginPage() {
  const { t } = useTranslation();

  return (
    <div className="wrap section">
      <div className="card" style={{ maxWidth: 440 }}>
        <p className="kicker">{t("auth.soonBadge")}</p>
        <h1>{t("auth.title")}</h1>
        <p className="lead">{t("auth.comingSoon")}</p>
        <p className="muted">{t("auth.lead")}</p>
        <div className="row" style={{ marginTop: "1.2rem" }}>
          <Link to="/">
            <button type="button">{t("auth.backHome")}</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
