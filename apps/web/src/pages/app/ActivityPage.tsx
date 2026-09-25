import { useState } from "react";
import { Link } from "react-router-dom";

const workouts = [
  { id: 1, title: "Силовая · верх", min: 42, kcal: 320, done: true },
  { id: 2, title: "Интервалы", min: 28, kcal: 290, done: true },
  { id: 3, title: "Мобилити", min: 20, kcal: 110, done: false },
];

const challenges = [
  { id: "c1", title: "7 дней движения", progress: 4, total: 7 },
  { id: "c2", title: "Горный километраж", progress: 12, total: 30 },
];

export function ActivityPage() {
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  async function syncDevices() {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 900));
    setSyncing(false);
    setSynced(true);
  }

  return (
    <div className="sx-page">
      <p className="sx-kicker">Трекер</p>
      <h1 className="sx-title">Активность</h1>
      <p className="sx-lead">Тренировки, челленджи и связь с устройствами.</p>

      <section className="sx-hero-metric sx-glow">
        <p className="sx-metric-label">Неделя</p>
        <p className="sx-metric-value">5 / 7</p>
        <p className="sx-metric-delta is-up">+2 к прошлой неделе</p>
        <div className="sx-progress" role="progressbar" aria-valuenow={71} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: "71%" }} />
        </div>
      </section>

      <section className="sx-section">
        <div className="sx-section-head">
          <h2>Тренировки</h2>
        </div>
        {workouts.length === 0 ? (
          <p className="sx-muted">Пока пусто — добавьте первую сессию.</p>
        ) : (
          <ul className="sx-list">
            {workouts.map((w) => (
              <li key={w.id} className="sx-list-row">
                <div>
                  <strong>{w.title}</strong>
                  <span className="sx-muted">
                    {w.min} мин · {w.kcal} ккал
                  </span>
                </div>
                <span className={`sx-status ${w.done ? "is-done" : ""}`}>{w.done ? "Готово" : "План"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sx-section">
        <div className="sx-section-head">
          <h2>Челленджи</h2>
        </div>
        <div className="sx-challenge-grid">
          {challenges.map((c) => (
            <article key={c.id} className="sx-challenge">
              <strong>{c.title}</strong>
              <div className="sx-progress">
                <span style={{ width: `${(c.progress / c.total) * 100}%` }} />
              </div>
              <span className="sx-muted">
                {c.progress}/{c.total}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="sx-section">
        <button type="button" className="sx-cta sx-cta-block" onClick={() => void syncDevices()} disabled={syncing}>
          {syncing ? "Синхронизация…" : synced ? "Устройства обновлены" : "Синхронизировать устройства"}
        </button>
        <p className="sx-muted" style={{ marginTop: "0.75rem" }}>
          Поддержка Apple Health / Google Fit — в следующем релизе API.
        </p>
        <Link to="/workouts" className="sx-text-link" style={{ display: "inline-block", marginTop: "0.8rem" }}>
          Материалы тренировок →
        </Link>
      </section>
    </div>
  );
}
