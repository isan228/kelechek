import { NavLink, useLocation } from "react-router-dom";

const tabs = [
  { to: "/app", end: true, label: "Обзор", icon: "⌂" },
  { to: "/app/activity", end: false, label: "Практика", icon: "▣" },
  { to: "/app/invest", end: false, label: "Банк", icon: "▤" },
  { to: "/app/portfolio", end: false, label: "Отчёт", icon: "▦" },
] as const;

export function AppTabBar() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/app/onboarding") || /^\/app\/invest\/[^/]+$/.test(pathname)) {
    return null;
  }

  return (
    <nav className="uw-tabbar" aria-label="Кабинет">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => `uw-tab ${isActive ? "is-active" : ""}`}
        >
          <span className="uw-tab-ico" aria-hidden>
            {tab.icon}
          </span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
