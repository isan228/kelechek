import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client";
import { useSiteCopy } from "../content/SiteCopyProvider";
import {
  IconActivity,
  IconChat,
  IconGrid,
  IconHeart,
  IconHome,
  IconLogout,
  IconPlus,
  IconUser,
} from "./UwIcons";

const tabs = [
  { to: "/app", end: true, label: "Лента", Icon: IconHome },
  { to: "/app/activity", end: false, label: "Активность", Icon: IconActivity },
  { to: "/app/invest", end: false, label: "Инвест", Icon: IconPlus, center: true },
  { to: "/app/portfolio", end: false, label: "Портфель", Icon: IconGrid },
  { to: "/profile", end: false, label: "Профиль", Icon: IconUser },
] as const;

export function AppBottomNav() {
  return (
    <nav className="uw-nav" aria-label="Навигация">
      <div className="uw-nav-inner">
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
              <tab.Icon />
            </span>
            <span className="uw-tab-label">{tab.label}</span>
          </NavLink>
        ))}
      </div>
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
        <img src="/ornament.svg" alt="" width={24} height={24} />
        <strong>{s("appName")}</strong>
      </Link>
      <div className="uw-topbar-actions">
        <Link to="/notifications" className="uw-topbar-ico" aria-label="Уведомления">
          <IconHeart />
        </Link>
        <Link to="/invites" className="uw-topbar-ico" aria-label="Приглашения">
          <IconChat />
        </Link>
        <Link to="/profile" className="uw-topbar-ava" aria-label="Профиль" title={name}>
          {name.slice(0, 1).toUpperCase()}
        </Link>
        <button type="button" className="uw-topbar-ico uw-topbar-logout" onClick={() => void logout()} aria-label="Выйти">
          <IconLogout />
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
