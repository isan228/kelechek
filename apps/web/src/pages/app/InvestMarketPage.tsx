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
          <p className="uw-eyebrow">Каталог</p>
          <h1 className="uw-h1">Инвестиции</h1>
        </div>
        <Link to="/memberships" className="uw-ghost-btn">
          Абонемент
        </Link>
      </header>
      <p className="uw-sub" style={{ marginTop: -8 }}>
        Объекты для накопления. Откройте карточку, чтобы увидеть условия и доходность.
      </p>

      {INVEST_ASSETS.length === 0 ? (
        <div className="uw-panel">
          <p className="uw-sub">Пока пусто — объекты появятся позже.</p>
        </div>
      ) : (
        <div className="uw-table-wrap">
          <table className="uw-table">
            <thead>
              <tr>
                <th>Объект</th>
                <th>Спорт</th>
                <th>Цена</th>
                <th>YTD</th>
                <th>День</th>
              </tr>
            </thead>
            <tbody>
              {INVEST_ASSETS.map((asset) => (
                <tr key={asset.id}>
                  <td>
                    <Link to={`/app/invest/${asset.id}`} className="uw-table-link">
                      {asset.name}
                    </Link>
                  </td>
                  <td>{asset.sport}</td>
                  <td>{formatSom(asset.price)}</td>
                  <td>{asset.yieldYtd}%</td>
                  <td className={asset.changePct >= 0 ? "uw-pos" : "uw-neg"}>
                    {asset.changePct >= 0 ? "+" : ""}
                    {asset.changePct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
