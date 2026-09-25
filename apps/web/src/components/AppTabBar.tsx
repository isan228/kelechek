import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client";
import { useSiteCopy } from "../content/SiteCopyProvider";

const navMain = [
  { to: "/app", end: true, label: "Добро пожаловать", icon: "⌂" },
  { to: "/app/activity", end: false, label: "Практика", icon: "▣" },
  { to: "/app/invest", end: false, label: "Банк объектов", icon: "▤" },
  { to: "/app/portfolio", end: false, label: "Производительность", icon: "▦" },
] as const;

const navMore = [
  { to: "/workouts", label: "Материалы", icon: "☰" },
  { to: "/schedule", label: "Расписание", icon: "◷" },
  { to: "/memberships", label: "Абонемент", icon: "◇" },
  { to: "/goal", label: "Цель", icon: "◎" },
  { to: "/notifications", label: "Уведомления", icon: "◉" },
  { to: "/invites", label: "Приглашения", icon: "↷" },
  { to: "/profile", label: "Настройки", icon: "⚙" },
] as const;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AppSidebar({ open, onClose }: Props) {
  const { user, setUser } = useAuth();
  const { s } = useSiteCopy();
  const navigate = useNavigate();
  const name = user?.firstName || user?.login || "Аккаунт";

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
    <>
      <button
        type="button"
        className={`uw-sidebar-backdrop ${open ? "is-open" : ""}`}
        aria-label="Закрыть меню"
        onClick={onClose}
      />
      <aside className={`uw-sidebar ${open ? "is-open" : ""}`} aria-label="Навигация кабинета">
        <div className="uw-sidebar-brand">
          <img src="/ornament.svg" alt="" />
          <div>
            <strong>{s("appName")}</strong>
            <span>Кабинет</span>
          </div>
        </div>

        <nav className="uw-sidebar-nav">
          {navMain.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `uw-side-link ${isActive ? "is-active" : ""}`}
              onClick={onClose}
            >
              <span className="uw-side-ico" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
          <div className="uw-side-sep" />
          {navMore.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `uw-side-link ${isActive ? "is-active" : ""}`}
              onClick={onClose}
            >
              <span className="uw-side-ico" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="uw-sidebar-account">
          <Link to="/profile" className="uw-side-user" onClick={onClose}>
            <span className="uw-side-user-ava" aria-hidden>
              {name.slice(0, 1).toUpperCase()}
            </span>
            <span className="uw-side-user-name">{name}</span>
          </Link>
          <button type="button" className="uw-side-logout" onClick={() => void logout()}>
            Выйти
          </button>
        </div>
      </aside>
    </>
  );
}

export function AppTopBar({ onMenu }: { onMenu: () => void }) {
  const { user } = useAuth();
  const name = user?.firstName || "друг";

  return (
    <header className="uw-topbar">
      <button type="button" className="uw-topbar-menu" aria-label="Меню" onClick={onMenu}>
        ☰
      </button>
      <p className="uw-topbar-hello">Добро пожаловать, {name}!</p>
      <div className="uw-topbar-actions">
        <Link to="/notifications" className="uw-topbar-ico" aria-label="Уведомления">
          ◉
        </Link>
        <Link to="/" className="uw-topbar-home">
          Home
        </Link>
      </div>
    </header>
  );
}

/** @deprecated bottom tabs removed — sidebar used instead */
export function AppTabBar() {
  return null;
}
