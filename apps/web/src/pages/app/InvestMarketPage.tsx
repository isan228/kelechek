import { Link } from "react-router-dom";
import { INVEST_ASSETS } from "../../app/investData";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

export function InvestMarketPage() {
  return (
    <div className="uw-page uw-feed">
      <header className="uw-social-head">
        <h1 className="uw-h1">Инвестиции</h1>
        <Link to="/memberships" className="uw-ghost-btn">
          Абонемент
        </Link>
      </header>
      <p className="uw-sub">Лента объектов — откройте карточку.</p>

      {INVEST_ASSETS.length === 0 ? (
        <div className="uw-panel">
          <p className="uw-sub">Пока пусто — объекты появятся позже.</p>
        </div>
      ) : (
        <div className="uw-explore">
          {INVEST_ASSETS.map((asset) => (
            <Link key={asset.id} to={`/app/invest/${asset.id}`} className="uw-explore-tile">
              <span className="uw-explore-sport">{asset.sport}</span>
              <strong>{asset.name}</strong>
              <span className="uw-explore-meta">
                {formatSom(asset.price)} ·{" "}
                <em className={asset.changePct >= 0 ? "uw-pos" : "uw-neg"}>
                  {asset.changePct >= 0 ? "+" : ""}
                  {asset.changePct}%
                </em>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
