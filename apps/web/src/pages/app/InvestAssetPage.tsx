import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getInvestAsset } from "../../app/investData";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

function BigChart({ data, up }: { data: number[]; up: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const coords = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 320;
    const y = 120 - ((v - min) / (max - min || 1)) * 96;
    return [x, y] as const;
  });
  const line = coords.map(([x, y]) => `${x},${y}`).join(" ");
  const area = `0,120 ${line} 320,120`;
  return (
    <svg className={`sx-chart ${up ? "is-up" : "is-down"}`} viewBox="0 0 320 120" role="img" aria-label="График динамики">
      <defs>
        <linearGradient id="sxFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#sxFill)" points={area} />
      <polyline fill="none" points={line} />
    </svg>
  );
}

export function InvestAssetPage() {
  const { id } = useParams();
  const asset = useMemo(() => (id ? getInvestAsset(id) : null), [id]);
  const [amount, setAmount] = useState("500");
  const [done, setDone] = useState(false);
  const [openRisk, setOpenRisk] = useState(false);

  if (!asset) {
    return (
      <div className="sx-page sx-state">
        <h1 className="sx-title">Объект не найден</h1>
        <p className="sx-lead">Возможно, ссылка устарела.</p>
        <Link to="/app/invest" className="sx-cta">
          К рынку
        </Link>
      </div>
    );
  }

  const progress = Math.round((asset.raised / asset.goal) * 100);
  const riskLabel = asset.risk === "low" ? "Низкий" : asset.risk === "mid" ? "Средний" : "Высокий";

  return (
    <div className="sx-page sx-asset-page">
      <Link to="/app/invest" className="sx-back">
        ← Рынок
      </Link>

      <p className="sx-kicker">{asset.sport}</p>
      <h1 className="sx-title">{asset.name}</h1>
      <p className="sx-lead">{asset.tagline}</p>

      <section className="sx-hero-metric sx-glow">
        <p className="sx-metric-label">Доходность YTD</p>
        <p className={`sx-metric-value ${asset.yieldYtd >= 0 ? "is-up" : "is-down"}`}>
          {asset.yieldYtd >= 0 ? "+" : ""}
          {asset.yieldYtd}%
        </p>
        <p className={`sx-metric-delta ${asset.changePct >= 0 ? "is-up" : "is-down"}`}>
          {asset.changePct >= 0 ? "+" : ""}
          {asset.changePct}% сегодня · цена {formatSom(asset.price)}
        </p>
        <BigChart data={asset.chart} up={asset.changePct >= 0} />
      </section>

      <div className="sx-stat-row">
        {asset.stats.map((s) => (
          <div key={s.label} className="sx-stat-pill">
            <span className="sx-muted">{s.label}</span>
            <b>{s.value}</b>
          </div>
        ))}
      </div>

      <section className="sx-section">
        <div className="sx-section-head">
          <h2>Сбор</h2>
          <span className="sx-muted">{progress}%</span>
        </div>
        <div className="sx-progress" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} role="progressbar">
          <span style={{ width: `${progress}%` }} />
        </div>
        <p className="sx-muted">
          {formatSom(asset.raised)} из {formatSom(asset.goal)} сом
        </p>
      </section>

      <section className="sx-section">
        <button
          type="button"
          className="sx-disclosure"
          aria-expanded={openRisk}
          onClick={() => setOpenRisk((v) => !v)}
        >
          <span>Риск-профиль: {riskLabel}</span>
          <span aria-hidden>{openRisk ? "−" : "+"}</span>
        </button>
        {openRisk && (
          <p className="sx-muted sx-disclosure-body">
            Оценка на основе волатильности объекта, стадии сбора и спортивного календаря. Не является индивидуальной
            рекомендацией.
          </p>
        )}
      </section>

      {!done ? (
        <form
          className="sx-invest-form"
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
          }}
        >
          <label>
            Сумма, сом
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              min={100}
            />
          </label>
          <button type="submit" className="sx-cta sx-cta-block" disabled={!amount || Number(amount) < 100}>
            Инвестировать
          </button>
        </form>
      ) : (
        <div className="sx-state sx-success-state">
          <p className="sx-title" style={{ fontSize: "1.4rem" }}>
            Заявка принята
          </p>
          <p className="sx-lead">{formatSom(Number(amount))} сом · {asset.name}</p>
          <Link to="/app" className="sx-cta">
            На обзор
          </Link>
        </div>
      )}
    </div>
  );
}
