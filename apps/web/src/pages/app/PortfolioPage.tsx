import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";
import { getOnboardingGoal, setOnboardingGoal, type OnboardingGoal } from "../../app/investData";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

const ops = [
  { id: 1, title: "Инвестиция · Айгуль Нурланова", amount: -5000, at: "24 сен" },
  { id: 2, title: "Начисление · абонемент", amount: 4100, at: "20 сен" },
  { id: 3, title: "Инвестиция · Issyk-Kul Trail", amount: -1500, at: "12 сен" },
];

const badges = ["Серия 7+", "Первый вклад", "Челлендж x2"];

export function PortfolioPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [goal, setGoal] = useState<OnboardingGoal>(getOnboardingGoal() ?? "both");

  useEffect(() => {
    void api
      .balance()
      .then((r) => setBalance(r.balance.available))
      .catch(() => setBalance(24850));
  }, []);

  return (
    <div className="sx-page">
      <p className="sx-kicker">Портфель</p>
      <h1 className="sx-title">{user?.firstName || "Профиль"}</h1>
      <p className="sx-lead">История, достижения и настройки фокуса.</p>

      <section className="sx-hero-metric sx-glow">
        <p className="sx-metric-label">Доступно</p>
        <p className="sx-metric-value">{formatSom(balance)} сом</p>
        <Link to="/progress" className="sx-text-link">
          Детали баланса →
        </Link>
      </section>

      <section className="sx-section">
        <h2>Достижения</h2>
        <div className="sx-chip-row">
          {badges.map((b) => (
            <span key={b} className="sx-chip is-accent">
              {b}
            </span>
          ))}
        </div>
      </section>

      <section className="sx-section">
        <h2>Операции</h2>
        <ul className="sx-list">
          {ops.map((o) => (
            <li key={o.id} className="sx-list-row">
              <div>
                <strong>{o.title}</strong>
                <span className="sx-muted">{o.at}</span>
              </div>
              <b className={o.amount >= 0 ? "is-up" : ""}>
                {o.amount >= 0 ? "+" : ""}
                {formatSom(o.amount)}
              </b>
            </li>
          ))}
        </ul>
      </section>

      <section className="sx-section">
        <h2>Фокус продукта</h2>
        <div className="sx-choice-list">
          {(
            [
              ["invest", "Инвестиции"],
              ["activity", "Активность"],
              ["both", "Оба"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`sx-choice ${goal === id ? "is-selected" : ""}`}
              onClick={() => {
                setGoal(id);
                setOnboardingGoal(id);
              }}
            >
              <span className="sx-choice-check" aria-hidden />
              <strong>{label}</strong>
            </button>
          ))}
        </div>
        <Link to="/profile" className="sx-text-link" style={{ display: "inline-block", marginTop: "1rem" }}>
          Аккаунт →
        </Link>
      </section>
    </div>
  );
}
