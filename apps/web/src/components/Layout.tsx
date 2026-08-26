import { useEffect, useRef, useState } from "react";
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
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const isCoach = user?.roles.includes("COACH");
  const isAdmin = user?.roles.includes("ADMIN");
  const isAccountant = user?.roles.includes("ACCOUNTANT");
  const isTrainee = user?.roles.includes("TRAINEE");
  const isAccountantOnly = Boolean(isAccountant && !isAdmin && !isCoach && !isTrainee);
  const isCoachOnly = Boolean(isCoach && !user?.roles.includes("TRAINEE") && !isAdmin && !isAccountant);
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

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
      /* ignore */
    }
    setUser(null);
    setOpen(false);
    setAccountOpen(false);
    navigate("/", { replace: true });
  }

  function close() {
    setOpen(false);
    setAccountOpen(false);
  }

  const publicLinks = isAccountantOnly
    ? null
    : (
        <>
          <NavLink to="/about" onClick={close}>{t("nav.about")}</NavLink>
          <NavLink to="/memberships" onClick={close}>{t("nav.memberships")}</NavLink>
          <NavLink to="/workouts" onClick={close}>{t("nav.workouts")}</NavLink>
          <NavLink to="/coaches" onClick={close}>{t("nav.coaches")}</NavLink>
          <NavLink to="/gallery" onClick={close} className="nav-hide-md">{t("nav.gallery")}</NavLink>
          <NavLink to="/news" onClick={close} className="nav-hide-md">{t("nav.news")}</NavLink>
        </>
      );

  return (
    <div className="site">
      <header className="site-header">
        <div className="wrap header-bar">
          <NavLink to={isAccountantOnly ? "/accounting" : "/"} className="brand" onClick={close}>
            <img src="/ornament.svg" alt="" />
            <span>{s("appName")}</span>
          </NavLink>

          {!isAccountantOnly && (
            <nav className="nav-desktop" aria-label="main">
              {publicLinks}
            </nav>
          )}

          <div className="header-actions">
            <span className="lang-switch">
              <button type="button" className={`lang-btn ${locale === "ru" ? "on" : ""}`} onClick={() => void switchLang("ru")}>
                RU
              </button>
              <button type="button" className={`lang-btn ${locale === "ky" ? "on" : ""}`} onClick={() => void switchLang("ky")}>
                KY
              </button>
            </span>

            {isAccountantOnly ? (
              <>
                <NavLink to="/accounting" className="nav-pill" onClick={close}>{t("nav.accounting")}</NavLink>
                <NavLink to="/profile" className="nav-pill ghost" onClick={close}>{t("nav.profile")}</NavLink>
              </>
            ) : user ? (
              <div className="account-menu" ref={accountRef}>
                <button
                  type="button"
                  className={`account-trigger ${accountOpen ? "on" : ""}`}
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-expanded={accountOpen}
                >
                  {user.firstName || t("nav.cabinet")}
                  <span aria-hidden>▾</span>
                </button>
                {accountOpen && (
                  <div className="account-dropdown">
                    {!isCoachOnly && <NavLink to="/cabinet" onClick={close}>{t("nav.cabinet")}</NavLink>}
                    {!isCoachOnly && <NavLink to="/progress" onClick={close}>{t("nav.progress")}</NavLink>}
                    {isTrainee && <NavLink to="/schedule" onClick={close}>{t("nav.schedule")}</NavLink>}
                    {isTrainee && <NavLink to="/checkin" onClick={close}>{t("nav.checkin")}</NavLink>}
                    {isTrainee && <NavLink to="/join" onClick={close}>{t("nav.scanCoach")}</NavLink>}
                    <NavLink to="/notifications" onClick={close}>{t("nav.notifications")}</NavLink>
                    {isCoach && <NavLink to="/coach" onClick={close}>{t("nav.wards")}</NavLink>}
                    <NavLink to="/profile" onClick={close}>{t("nav.profile")}</NavLink>
                    {isAdmin && <NavLink to="/admin" onClick={close}>{t("nav.admin")}</NavLink>}
                    {isAccountant && !isAdmin && (
                      <NavLink to="/accounting" onClick={close}>{t("nav.accounting")}</NavLink>
                    )}
                    <button type="button" className="account-logout" onClick={() => void logout()}>
                      {t("nav.logout")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <NavLink to="/login" className="nav-cta" onClick={close}>
                {t("nav.login")}
              </NavLink>
            )}

            {!isAccountantOnly && (
              <button
                className="menu-btn"
                type="button"
                aria-label="menu"
                aria-expanded={open}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? "✕" : "☰"}
              </button>
            )}
          </div>
        </div>

        {open && !isAccountantOnly && (
          <div className="nav-drawer">
            <div className="wrap nav-drawer-inner">
              <NavLink to="/" onClick={close}>{t("nav.home")}</NavLink>
              {publicLinks}
              {user && (
                <>
                  <hr className="nav-divider" />
                  {!isCoachOnly && <NavLink to="/cabinet" onClick={close}>{t("nav.cabinet")}</NavLink>}
                  {!isCoachOnly && <NavLink to="/progress" onClick={close}>{t("nav.progress")}</NavLink>}
                  {isTrainee && <NavLink to="/schedule" onClick={close}>{t("nav.schedule")}</NavLink>}
                  {isTrainee && <NavLink to="/checkin" onClick={close}>{t("nav.checkin")}</NavLink>}
                  <NavLink to="/notifications" onClick={close}>{t("nav.notifications")}</NavLink>
                  {isCoach && <NavLink to="/coach" onClick={close}>{t("nav.wards")}</NavLink>}
                  <NavLink to="/profile" onClick={close}>{t("nav.profile")}</NavLink>
                  {isAdmin && <NavLink to="/admin" onClick={close}>{t("nav.admin")}</NavLink>}
                </>
              )}
            </div>
          </div>
        )}
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
              <NavLink to="/gallery">{t("nav.gallery")}</NavLink>
              <br />
              <NavLink to="/news">{t("nav.news")}</NavLink>
              <br />
              <NavLink to="/coaches">{t("nav.coaches")}</NavLink>
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
