import { Link } from "react-router-dom";
import { INVEST_ASSETS } from "../../app/investData";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

export function InvestMarketPage() {
  if (INVEST_ASSETS.length === 0) {
    return (
      <div className="sx-page sx-state">
        <h1 className="sx-title">Рынок пуст</h1>
        <p className="sx-lead">Скоро здесь появятся объекты для инвестиций.</p>
      </div>
    );
  }

  return (
    <div className="sx-page">
      <p className="sx-kicker">Рынок</p>
      <h1 className="sx-title">Объекты</h1>
      <p className="sx-lead">Атлеты, команды и события с прозрачной динамикой.</p>

      <div className="sx-market-grid">
        {INVEST_ASSETS.map((asset) => (
          <Link key={asset.id} to={`/app/invest/${asset.id}`} className="sx-market-card sx-glow">
            <span className="sx-badge">{asset.sport}</span>
            <h2>{asset.name}</h2>
            <p className="sx-muted">{asset.tagline}</p>
            <div className="sx-market-meta">
              <div>
                <span className="sx-muted">Цена</span>
                <b>{formatSom(asset.price)}</b>
              </div>
              <div>
                <span className="sx-muted">YTD</span>
                <b className={asset.yieldYtd >= 0 ? "is-up" : "is-down"}>
                  {asset.yieldYtd >= 0 ? "+" : ""}
                  {asset.yieldYtd}%
                </b>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
