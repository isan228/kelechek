import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";
import { CIRCLE, PATH_NODES, getOnboardingGoal } from "../../app/investData";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

export function DashboardPage() {
  const { user } = useAuth();
  const goal = getOnboardingGoal() ?? "both";
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void api
      .balance()
      .then((r) => {
        if (alive) setBalance(r.balance.available);
      })
      .catch(() => {
        if (alive) setBalance(24850);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const current = PATH_NODES.find((n) => n.status === "current") ?? PATH_NODES[0];
  const doneCount = PATH_NODES.filter((n) => n.status === "done").length;
  const people = CIRCLE.filter((p) => p.role !== "you");

  if (loading) {
    return (
      <div className="sx-page" role="status" aria-label="Загрузка">
        <div className="sx-skeleton sx-skeleton-lg" />
        <div className="sx-skeleton" />
        <div className="sx-skeleton sx-skeleton-card" />
      </div>
    );
  }

  return (
    <div className="sx-page">
      <header className="sx-dash-head">
        <div>
          <p className="sx-kicker">Круг</p>
          <h1 className="sx-hello">{user?.firstName ? `Привет, ${user.firstName}` : "Ваш круг"}</h1>
        </div>
        <Link to="/app/portfolio" className="sx-avatar" aria-label="Профиль">
          {(user?.firstName?.[0] || "K").toUpperCase()}
        </Link>
      </header>

      {current && (
        <section className="sx-next sx-glow" aria-labelledby="next-step">
          <div className="sx-next-top">
            <p className="sx-metric-label" id="next-step">
              Следующий шаг · {doneCount}/{PATH_NODES.length}
            </p>
            <Link to="/app/activity" className="sx-text-link">
              Весь путь
            </Link>
          </div>
          <h2 className="sx-next-title">{current.title}</h2>
          <p className="sx-muted">{current.detail}</p>
          <div className="sx-progress" role="progressbar" aria-valuenow={Math.round((doneCount / PATH_NODES.length) * 100)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${(doneCount / PATH_NODES.length) * 100}%` }} />
          </div>
          <Link to={current.ctaTo} className="sx-cta sx-cta-block">
            {current.cta}
          </Link>
        </section>
      )}

      <section className="sx-section" aria-labelledby="people-title">
        <div className="sx-section-head">
          <h2 id="people-title">Люди рядом</h2>
          <Link to="/invites" className="sx-text-link">
            + Пригласить
          </Link>
        </div>
        <ul className="sx-people">
          {people.map((person) => {
            const row = (
              <>
                <span className="sx-people-ava" aria-hidden>
                  {person.initials}
                </span>
                <span className="sx-people-text">
                  <strong>{person.name}</strong>
                  <span className="sx-muted">{person.subtitle}</span>
                </span>
                {person.pulse ? <span className="sx-people-meta">{person.pulse}</span> : null}
              </>
            );
            return (
              <li key={person.id}>
                {person.to ? (
                  <Link to={person.to} className="sx-people-row">
                    {row}
                  </Link>
                ) : (
                  <div className="sx-people-row">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {(goal === "invest" || goal === "both") && (
        <section className="sx-section">
          <Link to="/app/invest" className="sx-balance-link">
            <span>
              <span className="sx-metric-label">Баланс</span>
              <strong className="sx-mini-value">{formatSom(balance ?? 0)} сом</strong>
            </span>
            <span className="sx-text-link">Рынок →</span>
          </Link>
        </section>
      )}

      <section className="sx-section" aria-labelledby="feed-title">
        <h2 id="feed-title">Недавно в круге</h2>
        <ul className="sx-feed">
          <li>
            <b>Айгуль</b> — серия тренировок
            <span className="sx-muted"> · 2ч</span>
          </li>
          <li>
            <b>Тимур</b> — закрыл шаг пути
            <span className="sx-muted"> · вчера</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
