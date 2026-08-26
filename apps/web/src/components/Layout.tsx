import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client";
import { useSiteCopy } from "../content/SiteCopyProvider";

export function Layout() {
  const { t, i18n } = useTranslation();
  const { s } = useSiteCopy();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const isCoach = user?.roles.includes("COACH");
  const isAdmin = user?.roles.includes("ADMIN");
  const isAccountant = user?.roles.includes("ACCOUNTANT");
  const isTrainee = user?.roles.includes("TRAINEE");
  const isAccountantOnly = Boolean(isAccountant && !isAdmin && !isCoach && !isTrainee);
  const isCoachOnly = Boolean(isCoach && !user?.roles.includes("TRAINEE") && !isAdmin && !isAccountant);
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";

  async function switchLang(next: "ru" | "ky") {
    await i18n.changeLanguage(next);
    localStorage.setItem("locale", next);
    if (user) {
      const res = await api.patchMe({ locale: next });
      setUser(res.user);
    }
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      /* всё равно выходим локально */
    }
    setUser(null);
    setOpen(false);
    navigate("/", { replace: true });
  }

  function close() {
    setOpen(false);
  }

  return (
    <div className="site">
      <header className="site-header">
        <div className="wrap">
          <NavLink to={isAccountantOnly ? "/accounting" : "/"} className="brand" onClick={close}>
            <img src="/ornament.svg" alt="" />
            {s("appName")}
          </NavLink>
          <button className="menu-btn" type="button" aria-label="menu" onClick={() => setOpen((v) => !v)}>
            ☰
          </button>
          <nav className={`nav ${open ? "open" : ""}`}>
            {isAccountantOnly ? (
              <>
                <NavLink to="/accounting" onClick={close}>{t("nav.accounting")}</NavLink>
                <NavLink to="/profile" onClick={close}>{t("nav.profile")}</NavLink>
              </>
            ) : (
              <>
                <NavLink to="/" onClick={close}>{t("nav.home")}</NavLink>
                <NavLink to="/about" onClick={close}>{t("nav.about")}</NavLink>
                <NavLink to="/memberships" onClick={close}>{t("nav.memberships")}</NavLink>
                <NavLink to="/workouts" onClick={close}>{t("nav.workouts")}</NavLink>
                <NavLink to="/coaches" onClick={close}>{t("nav.coaches")}</NavLink>
                <NavLink to="/gallery" onClick={close}>{t("nav.gallery")}</NavLink>
                <NavLink to="/news" onClick={close}>{t("nav.news")}</NavLink>
                {user && !isCoachOnly && <NavLink to="/cabinet" onClick={close}>{t("nav.cabinet")}</NavLink>}
                {user && !isCoachOnly && <NavLink to="/progress" onClick={close}>{t("nav.progress")}</NavLink>}
                {isTrainee && <NavLink to="/schedule" onClick={close}>{t("nav.schedule")}</NavLink>}
                {isTrainee && <NavLink to="/join" onClick={close}>{t("nav.scanCoach")}</NavLink>}
                {isTrainee && <NavLink to="/checkin" onClick={close}>{t("nav.checkin")}</NavLink>}
                {user && <NavLink to="/notifications" onClick={close}>{t("nav.notifications")}</NavLink>}
                {isCoach && <NavLink to="/coach" onClick={close}>{t("nav.wards")}</NavLink>}
                {user && <NavLink to="/profile" onClick={close}>{t("nav.profile")}</NavLink>}
                {isAdmin && <NavLink to="/admin" onClick={close}>{t("nav.admin")}</NavLink>}
                {isAccountant && !isAdmin && <NavLink to="/accounting" onClick={close}>{t("nav.accounting")}</NavLink>}
              </>
            )}
            <span className="lang-switch">
              <button type="button" className={`lang-btn ${locale === "ru" ? "on" : ""}`} onClick={() => void switchLang("ru")}>
                RU
              </button>
              <button type="button" className={`lang-btn ${locale === "ky" ? "on" : ""}`} onClick={() => void switchLang("ky")}>
                KY
              </button>
            </span>
            {user ? (
              <button className="ghost" type="button" onClick={() => void logout()}>
                {t("nav.logout")}
              </button>
            ) : (
              <NavLink to="/login" className="nav-cta" onClick={close}>
                {t("nav.login")}
              </NavLink>
            )}
          </nav>
        </div>
      </header>
      <main className="site-main">
        <Outlet />
      </main>
      {!isAccountantOnly && (
        <footer className="site-footer">
          <div className="wrap footer-grid">
            <div>
              <div className="brand" style={{ color: "#f4efe6" }}>
                <img src="/ornament.svg" alt="" />
                {s("appName")}
              </div>
              <p>{s("footer.tag")}</p>
            </div>
            <div>
              <NavLink to="/about">{t("nav.about")}</NavLink>
              <br />
              <NavLink to="/memberships">{t("nav.memberships")}</NavLink>
              <br />
              <NavLink to="/workouts">{t("nav.workouts")}</NavLink>
            </div>
            <div>
              <NavLink to="/coaches">{t("nav.coaches")}</NavLink>
              <br />
              <NavLink to="/goal">{t("nav.goal")}</NavLink>
            </div>
          </div>
          <div className="wrap">
            <p className="disclaimer">{s("disclaimer")}</p>
          </div>
        </footer>
      )}
    </div>
  );
}
