import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";
import { INVEST_ASSETS, getOnboardingGoal } from "../../app/investData";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

function ActivityRing({ pct, label }: { pct: number; label: string }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, pct) / 100) * c;
  return (
    <div className="sx-ring" aria-label={`${label}: ${pct}%`}>
      <svg viewBox="0 0 88 88" width="88" height="88">
        <circle className="sx-ring-track" cx="44" cy="44" r={r} />
        <circle
          className="sx-ring-value"
          cx="44"
          cy="44"
          r={r}
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="sx-ring-label">
        <b>{pct}%</b>
        <span>{label}</span>
      </div>
    </div>
  );
}

function MiniChart({ data, up }: { data: number[]; up: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 36 - ((v - min) / (max - min || 1)) * 28;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg className={`sx-spark ${up ? "is-up" : "is-down"}`} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden>
      <polyline fill="none" points={pts} />
    </svg>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const goal = getOnboardingGoal() ?? "both";
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void api
      .balance()
      .then((r) => {
        if (!alive) return;
        setBalance(r.balance.available);
        setError(false);
      })
      .catch(() => {
        if (!alive) return;
        setBalance(24850);
        setError(false);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const showInvest = goal === "invest" || goal === "both";
  const showActivity = goal === "activity" || goal === "both";
  const portfolioChange = 3.6;

  if (loading) {
    return (
      <div className="sx-page" role="status" aria-label="Загрузка дашборда">
        <div className="sx-skeleton sx-skeleton-lg" />
        <div className="sx-skeleton" />
        <div className="sx-card-grid">
          <div className="sx-skeleton sx-skeleton-card" />
          <div className="sx-skeleton sx-skeleton-card" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sx-page sx-state">
        <h1 className="sx-title">Не удалось загрузить</h1>
        <p className="sx-lead">Проверьте соединение и попробуйте снова.</p>
        <button type="button" className="sx-cta" onClick={() => window.location.reload()}>
          Обновить
        </button>
      </div>
    );
  }

  return (
    <div className="sx-page">
      <header className="sx-dash-head">
        <div>
          <p className="sx-kicker">Сегодня</p>
          <h1 className="sx-hello">
            {user?.firstName ? `Привет, ${user.firstName}` : "Ваш обзор"}
          </h1>
        </div>
        <Link to="/app/portfolio" className="sx-avatar" aria-label="Портфель">
          {(user?.firstName?.[0] || "K").toUpperCase()}
        </Link>
      </header>

      {showInvest && (
        <section className="sx-hero-metric sx-glow" aria-labelledby="portfolio-total">
          <p className="sx-metric-label" id="portfolio-total">
            Портфель
          </p>
          <p className="sx-metric-value">{formatSom(balance ?? 0)} сом</p>
          <p className={`sx-metric-delta ${portfolioChange >= 0 ? "is-up" : "is-down"}`}>
            {portfolioChange >= 0 ? "+" : ""}
            {portfolioChange}% за 7 дней
          </p>
          <Link to="/app/invest" className="sx-cta sx-cta-block">
            Смотреть рынок
          </Link>
        </section>
      )}

      {showActivity && (
        <section className="sx-section" aria-labelledby="activity-summary">
          <div className="sx-section-head">
            <h2 id="activity-summary">Активность</h2>
            <Link to="/app/activity" className="sx-text-link">
              Все →
            </Link>
          </div>
          <div className="sx-rings">
            <ActivityRing pct={72} label="Move" />
            <ActivityRing pct={54} label="Train" />
            <ActivityRing pct={88} label="Streak" />
          </div>
          <div className="sx-chip-row">
            <span className="sx-chip">Серия 9 дн.</span>
            <span className="sx-chip">Челлендж: 4/7</span>
          </div>
        </section>
      )}

      {showInvest && (
        <section className="sx-section" aria-labelledby="watchlist">
          <div className="sx-section-head">
            <h2 id="watchlist">В фокусе</h2>
            <Link to="/app/invest" className="sx-text-link">
              Рынок →
            </Link>
          </div>
          <div className="sx-asset-list">
            {INVEST_ASSETS.map((asset) => (
              <Link key={asset.id} to={`/app/invest/${asset.id}`} className="sx-asset-row">
                <div>
                  <strong>{asset.name}</strong>
                  <span className="sx-muted">
                    {asset.sport} · {asset.kind === "athlete" ? "Атлет" : asset.kind === "team" ? "Команда" : "Событие"}
                  </span>
                </div>
                <MiniChart data={asset.chart} up={asset.changePct >= 0} />
                <div className="sx-asset-price">
                  <b>{formatSom(asset.price)}</b>
                  <span className={asset.changePct >= 0 ? "is-up" : "is-down"}>
                    {asset.changePct >= 0 ? "+" : ""}
                    {asset.changePct}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {showActivity && !showInvest && (
        <section className="sx-section">
          <Link to="/app/activity" className="sx-cta sx-cta-block">
            Открыть трекер
          </Link>
        </section>
      )}
    </div>
  );
}
