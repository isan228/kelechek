import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client";

export function Layout() {
  const { t, i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const isCoach = user?.roles.includes("COACH");
  const isTrainee = user?.roles.includes("TRAINEE");

  async function switchLang(locale: "ru" | "ky") {
    await i18n.changeLanguage(locale);
    if (user) {
      const res = await api.patchMe({ locale });
      setUser(res.user);
    }
  }

  async function logout() {
    await api.logout();
    setUser(null);
    navigate("/login");
  }

  return (
    <div className="shell">
      <header className="top">
        <NavLink to="/" className="brand">
          {t("appName")}
        </NavLink>
        {user && (
          <nav className="nav">
            <NavLink to="/">{t("nav.home")}</NavLink>
            {isTrainee && <NavLink to="/balance">{t("nav.balance")}</NavLink>}
            <NavLink to="/content">{t("nav.content")}</NavLink>
            {isTrainee && <NavLink to="/invites">{t("nav.invites")}</NavLink>}
            {isCoach && <NavLink to="/coach">{t("nav.coach")}</NavLink>}
            <NavLink to="/profile">{t("nav.profile")}</NavLink>
            <button className="secondary" type="button" onClick={() => void logout()}>
              {t("nav.logout")}
            </button>
          </nav>
        )}
        <div className="lang-switch">
          <button type="button" className={i18n.language === "ru" ? "on" : ""} onClick={() => void switchLang("ru")}>
            RU
          </button>
          <button type="button" className={i18n.language.startsWith("ky") ? "on" : ""} onClick={() => void switchLang("ky")}>
            KY
          </button>
        </div>
      </header>
      <Outlet />
      <p className="disclaimer">{t("disclaimer")}</p>
    </div>
  );
}
