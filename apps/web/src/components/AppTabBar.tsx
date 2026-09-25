import { useEffect, useState } from "react";
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

const moreLinks = [
  { to: "/schedule", label: "Расписание" },
  { to: "/workouts", label: "Материалы" },
  { to: "/memberships", label: "Абонемент" },
  { to: "/goal", label: "Цель" },
] as const;

export function AppBottomNav() {
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
    <nav className="uw-nav" aria-label="Навигация">
      <Link to="/app" className="uw-nav-brand">
        <img src="/ornament.svg" alt="" width={28} height={28} />
        <strong>{s("appName")}</strong>
      </Link>

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

      <div className="uw-nav-more" aria-label="Сервисы">
        <p className="uw-nav-more-label">Сервисы</p>
        {moreLinks.map((link) => (
          <Link key={link.to} to={link.to} className="uw-nav-more-link">
            {link.label}
          </Link>
        ))}
      </div>

      <div className="uw-nav-foot">
        <Link to="/profile" className="uw-nav-user">
          <span className="uw-nav-user-ava" aria-hidden>
            {name.slice(0, 1).toUpperCase()}
          </span>
          <span className="uw-nav-user-meta">
            <strong>{name}</strong>
            <span>Личный кабинет</span>
          </span>
        </Link>
        <button type="button" className="uw-nav-logout" onClick={() => void logout()} aria-label="Выйти">
          <IconLogout />
          <span>Выйти</span>
        </button>
      </div>
    </nav>
  );
}

export function AppTopBar() {
  const { user } = useAuth();
  const { s } = useSiteCopy();
  const name = user?.firstName || user?.login || "Вы";

  return (
    <header className="uw-topbar">
      <Link to="/app" className="uw-topbar-brand">
        <img src="/ornament.svg" alt="" width={24} height={24} />
        <strong>{s("appName")}</strong>
      </Link>
      <p className="uw-topbar-title">Лента</p>
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
      </div>
    </header>
  );
}

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

export function AppAside() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const name = user?.firstName || user?.login || "Аккаунт";

  useEffect(() => {
    void api
      .balance()
      .then((r) => {
        setBalance(r.balance.available);
        setStreak(r.streak);
      })
      .catch(() => {
        setBalance(null);
      });
  }, []);

  return (
    <aside className="uw-aside" aria-label="Сводка">
      <div className="uw-aside-card">
        <div className="uw-aside-user">
          <span className="uw-aside-ava">{name.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>{name}</strong>
            <span>Ваш прогресс</span>
          </div>
        </div>
        <div className="uw-aside-kpis">
          <div>
            <b>{balance == null ? "—" : formatSom(balance)}</b>
            <span>баланс, сом</span>
          </div>
          <div>
            <b>{streak}</b>
            <span>серия, мес.</span>
          </div>
        </div>
        <Link to="/app/invest" className="uw-aside-cta">
          Смотреть инвестиции
        </Link>
      </div>

      <div className="uw-aside-card">
        <h2 className="uw-aside-h">Быстрые ссылки</h2>
        <ul className="uw-aside-links">
          <li>
            <Link to="/checkin">Отметить посещение</Link>
          </li>
          <li>
            <Link to="/schedule">Расписание</Link>
          </li>
          <li>
            <Link to="/goal">Условия цели</Link>
          </li>
          <li>
            <Link to="/">На сайт</Link>
          </li>
        </ul>
      </div>

      <p className="uw-aside-foot">Kelechek · спорт и накопления</p>
    </aside>
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
