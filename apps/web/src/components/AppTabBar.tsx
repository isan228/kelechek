import { NavLink, useLocation } from "react-router-dom";

const tabs = [
  { to: "/app", end: true, label: "Обзор", icon: "◆" },
  { to: "/app/invest", end: false, label: "Рынок", icon: "▣" },
  { to: "/app/activity", end: false, label: "Активность", icon: "◎" },
  { to: "/app/portfolio", end: false, label: "Портфель", icon: "▢" },
] as const;

export function AppTabBar() {
  const { pathname } = useLocation();
  const hide = pathname.startsWith("/app/onboarding") || /^\/app\/invest\/[^/]+$/.test(pathname);

  if (hide) return null;

  return (
    <nav className="sx-tabbar" aria-label="Основная навигация">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `sx-tab ${isActive ? "is-active" : ""}`}
        >
          <span className="sx-tab-icon" aria-hidden>
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
