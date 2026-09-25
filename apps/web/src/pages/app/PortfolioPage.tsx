import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

export function PortfolioPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hold, setHold] = useState({ have: 0, need: 12 });

  useEffect(() => {
    void api
      .balance()
      .then((r) => {
        setBalance(r.balance.available);
        setStreak(r.streak);
        setHold({
          have: r.withdrawalProgress.monthsHeld,
          need: r.withdrawalProgress.holdingMonths,
        });
      })
      .catch(() => undefined);
  }, []);

  const name = user?.firstName || user?.login || "Аккаунт";
  const rows = [
    { label: "Серия", value: streak > 0 ? "Стабильно" : "Пауза", pct: Math.min(100, streak * 10) },
    { label: "Накопление", value: balance > 0 ? "Активен" : "Пауза", pct: Math.min(100, Math.round(balance / 50)) },
    { label: "Выдержка", value: `${hold.have}/${hold.need}`, pct: Math.round((hold.have / hold.need) * 100) },
  ];

  return (
    <div className="uw-page uw-feed">
      <header className="uw-profile-head">
        <span className="uw-profile-ava">{name.slice(0, 1).toUpperCase()}</span>
        <div className="uw-profile-stats">
          <div>
            <b>{formatSom(balance)}</b>
            <span>баланс</span>
          </div>
          <div>
            <b>{streak}</b>
            <span>серия</span>
          </div>
          <div>
            <b>
              {hold.have}/{hold.need}
            </b>
            <span>выдержка</span>
          </div>
        </div>
      </header>
      <div className="uw-profile-bio">
        <strong>{name}</strong>
        <p className="uw-sub">Портфель и прогресс к цели</p>
      </div>
      <div className="uw-profile-actions">
        <Link to="/profile" className="uw-ghost-btn">
          Редактировать
        </Link>
        <Link to="/memberships" className="uw-ghost-btn">
          Абонемент
        </Link>
      </div>

      <section className="uw-panel">
        <h2 className="uw-h2">Метрики</h2>
        <ul className="uw-subjects">
          {rows.map((r) => (
            <li key={r.label} className="uw-subject">
              <div className="uw-subject-top">
                <strong>{r.label}</strong>
                <span>{r.value}</span>
              </div>
              <div className="uw-bar" aria-hidden>
                <span style={{ width: `${Math.min(100, r.pct)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="uw-link-stack">
        <Link to="/progress">История операций →</Link>
        <Link to="/goal">Цель и правила →</Link>
        <Link to="/notifications">Уведомления →</Link>
      </div>
    </div>
  );
}
