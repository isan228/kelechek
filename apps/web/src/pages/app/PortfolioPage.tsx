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

  const rows = [
    { label: "Корректность серии", value: streak > 0 ? "Стабильно" : "Низкая", pct: Math.min(100, streak * 10) },
    { label: "Темп накопления", value: balance > 0 ? "Активен" : "Пауза", pct: Math.min(100, Math.round(balance / 50)) },
    { label: "Выдержка", value: `${hold.have}/${hold.need}`, pct: Math.round((hold.have / hold.need) * 100) },
  ];

  return (
    <div className="uw-page">
      <header className="uw-top">
        <div>
          <p className="uw-eyebrow">Performance</p>
          <h1 className="uw-h1">Отчёт</h1>
        </div>
        <Link to="/profile" className="uw-ghost-btn">
          {user?.firstName || "Аккаунт"}
        </Link>
      </header>

      <section className="uw-panel">
        <h2 className="uw-h2">Сводка</h2>
        <div className="uw-stats">
          <div className="uw-stat">
            <span className="uw-sub">Баланс</span>
            <b>{formatSom(balance)}</b>
          </div>
          <div className="uw-stat">
            <span className="uw-sub">Серия</span>
            <b>{streak}</b>
          </div>
          <div className="uw-stat">
            <span className="uw-sub">Выдержка</span>
            <b>
              {hold.have}/{hold.need}
            </b>
          </div>
        </div>
      </section>

      <section className="uw-panel">
        <h2 className="uw-h2">Разбор по метрикам</h2>
        <ul className="uw-subjects">
          {rows.map((r) => (
            <li key={r.label} className="uw-subject" style={{ cursor: "default" }}>
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
        <Link to="/memberships">Абонемент →</Link>
        <Link to="/notifications">Уведомления →</Link>
      </div>
    </div>
  );
}
