import { Link } from "react-router-dom";
import { INVEST_ASSETS } from "../../app/investData";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

export function InvestMarketPage() {
  return (
    <div className="uw-page">
      <header className="uw-top">
        <div>
          <p className="uw-eyebrow">QBank · объекты</p>
          <h1 className="uw-h1">Банк</h1>
        </div>
        <Link to="/memberships" className="uw-ghost-btn">
          Абонемент
        </Link>
      </header>
      <p className="uw-sub" style={{ marginTop: -8 }}>
        Выберите объект — как тему в банке вопросов. Сначала сводка, детали по открытию.
      </p>

      {INVEST_ASSETS.length === 0 ? (
        <div className="uw-panel">
          <p className="uw-sub">Пока пусто — объекты появятся позже.</p>
        </div>
      ) : (
        <ul className="uw-blocks">
          {INVEST_ASSETS.map((asset) => (
            <li key={asset.id}>
              <Link to={`/app/invest/${asset.id}`} className="uw-block">
                <div>
                  <strong>{asset.name}</strong>
                  <span className="uw-sub">
                    {asset.sport} · {formatSom(asset.price)} · YTD {asset.yieldYtd}%
                  </span>
                </div>
                <span className={`uw-pill ${asset.changePct >= 0 ? "" : "is-timed"}`}>
                  {asset.changePct >= 0 ? "+" : ""}
                  {asset.changePct}%
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
