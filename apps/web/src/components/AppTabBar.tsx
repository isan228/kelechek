import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../api/client";
import { useSiteCopy } from "../content/SiteCopyProvider";

type NavItem = { to: string; end?: boolean; label: string; short: string; icon: string };

const NAV: NavItem[] = [
  {
    to: "/app",
    end: true,
    label: "Стрик и возврат",
    short: "Стрик",
    icon: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  },
  {
    to: "/app/coach",
    label: "Тренер",
    short: "Тренер",
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  },
  {
    to: "/app/training",
    label: "Тренировки",
    short: "Тренировки",
    icon: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  },
  {
    to: "/app/admission",
    label: "Поступление",
    short: "Вуз",
    icon: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5",
  },
  {
    to: "/app/profile",
    label: "Профиль",
    short: "Профиль",
    icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 15c2 2 5 2 7 0M9 10h.01M15 10h.01",
  },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="cab-nv-ico" viewBox="0 0 24 24" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function CabTopNav() {
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
    <header className="cab-top">
      <Link to="/app" className="cab-logo">
        <span className="cab-logo-dot" aria-hidden />
        {s("appName")}
      </Link>

      <nav className="cab-top-nav" aria-label="Разделы кабинета">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `cab-nv ${isActive ? "is-active" : ""}`}
          >
            <NavIcon d={item.icon} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="cab-top-user">
        <Link to="/app/profile" className="cab-ava" aria-label="Профиль" title={name}>
          {name.slice(0, 1).toUpperCase()}
        </Link>
        <button type="button" className="cab-logout" onClick={() => void logout()}>
          Выйти
        </button>
      </div>
    </header>
  );
}

export function CabBottomNav() {
  return (
    <nav className="cab-bottom" aria-label="Разделы кабинета">
      <div className="cab-bottom-inner">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `cab-bnv ${isActive ? "is-active" : ""}`}
          >
            <NavIcon d={item.icon} />
            <span>{item.short}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
