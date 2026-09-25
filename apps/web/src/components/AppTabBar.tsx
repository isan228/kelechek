import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client";
import { useSiteCopy } from "../content/SiteCopyProvider";

const tabs = [
  { to: "/app", end: true, label: "Лента", icon: "⌂" },
  { to: "/app/activity", end: false, label: "Активность", icon: "▣" },
  { to: "/app/invest", end: false, label: "Инвест", icon: "＋", center: true },
  { to: "/app/portfolio", end: false, label: "Портфель", icon: "▦" },
  { to: "/profile", end: false, label: "Профиль", icon: "◎" },
] as const;

export function AppBottomNav() {
  return (
    <nav className="uw-tabbar" aria-label="Навигация">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={"end" in tab ? tab.end : false}
          className={({ isActive }) =>
            `uw-tab ${"center" in tab && tab.center ? "uw-tab-center" : ""} ${isActive ? "is-active" : ""}`
          }
        >
          <span className="uw-tab-ico" aria-hidden>
            {tab.icon}
          </span>
          <span className="uw-tab-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppTopBar() {
  const { user, setUser } = useAuth();
  const { s } = useSiteCopy();
  const navigate = useNavigate();
  const name = user?.firstName || user?.login || "Вы";

  async function logout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setUser(null);
    navigate("/", { replace: true });
  }

  return (
    <header className="uw-topbar">
      <Link to="/app" className="uw-topbar-brand">
        <img src="/ornament.svg" alt="" />
        <strong>{s("appName")}</strong>
      </Link>
      <div className="uw-topbar-actions">
        <Link to="/notifications" className="uw-topbar-ico" aria-label="Уведомления">
          ♡
        </Link>
        <Link to="/invites" className="uw-topbar-ico" aria-label="Сообщения">
          ✉
        </Link>
        <button type="button" className="uw-topbar-ava" onClick={() => void logout()} title="Выйти">
          {name.slice(0, 1).toUpperCase()}
        </button>
      </div>
    </header>
  );
}

/** @deprecated — use AppBottomNav */
export function AppTabBar() {
  return <AppBottomNav />;
}

/** @deprecated — sidebar removed */
export function AppSidebar(_props: { open: boolean; onClose: () => void }) {
  return null;
}
