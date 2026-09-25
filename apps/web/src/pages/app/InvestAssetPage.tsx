import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getInvestAsset } from "../../app/investData";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

export function InvestAssetPage() {
  const { id } = useParams();
  const asset = useMemo(() => (id ? getInvestAsset(id) : null), [id]);
  const [amount, setAmount] = useState("500");
  const [done, setDone] = useState(false);
  const [showExplain, setShowExplain] = useState(false);

  if (!asset) {
    return (
      <div className="uw-page">
        <h1 className="uw-h1">Не найдено</h1>
        <Link to="/app/invest" className="uw-primary">
          К банку
        </Link>
      </div>
    );
  }

  const progress = Math.round((asset.raised / asset.goal) * 100);
  const risk = asset.risk === "low" ? "Low" : asset.risk === "mid" ? "Moderate" : "High";

  return (
    <div className="uw-page">
      <Link to="/app/invest" className="uw-back">
        ← Банк
      </Link>
      <p className="uw-eyebrow">{asset.sport}</p>
      <h1 className="uw-h1">{asset.name}</h1>
      <p className="uw-sub">{asset.tagline}</p>

      <section className="uw-panel">
        <div className="uw-stats">
          <div className="uw-stat">
            <span className="uw-sub">YTD</span>
            <b className={asset.yieldYtd >= 0 ? "uw-pos" : "uw-neg"}>
              {asset.yieldYtd >= 0 ? "+" : ""}
              {asset.yieldYtd}%
            </b>
          </div>
          <div className="uw-stat">
            <span className="uw-sub">Цена</span>
            <b>{formatSom(asset.price)}</b>
          </div>
          <div className="uw-stat">
            <span className="uw-sub">Risk</span>
            <b>{risk}</b>
          </div>
        </div>
        <div className="uw-subject-top" style={{ marginTop: 12 }}>
          <span className="uw-sub">Сбор</span>
          <span>{progress}%</span>
        </div>
        <div className="uw-bar">
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <button type="button" className="uw-explain" onClick={() => setShowExplain((v) => !v)}>
        {showExplain ? "Скрыть пояснение" : "Показать пояснение"} (как explanation)
      </button>
      {showExplain && (
        <p className="uw-sub">
          Риск и доходность — учебная сводка по объекту. Не индивидуальная рекомендация. Статистика:{" "}
          {asset.stats.map((s) => `${s.label} ${s.value}`).join(" · ")}.
        </p>
      )}

      {!done ? (
        <form
          className="uw-panel"
          onSubmit={(e) => {
            e.preventDefault();
            setDone(true);
          }}
        >
          <label className="uw-label">
            Сумма вклада, сом
            <input
              className="uw-input"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            />
          </label>
          <button type="submit" className="uw-primary" disabled={!amount || Number(amount) < 100}>
            Инвестировать
          </button>
        </form>
      ) : (
        <div className="uw-panel">
          <h2 className="uw-h2">Заявка принята</h2>
          <p className="uw-sub">
            {formatSom(Number(amount))} сом · {asset.name}
          </p>
          <Link to="/app" className="uw-primary">
            В обзор
          </Link>
        </div>
      )}
    </div>
  );
}
