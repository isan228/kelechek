import { Link } from "react-router-dom";
import { PATH_NODES } from "../../app/investData";

export function ActivityPage() {
  const current = PATH_NODES.find((n) => n.status === "current");
  const done = PATH_NODES.filter((n) => n.status === "done").length;

  return (
    <div className="sx-page">
      <p className="sx-kicker">Путь</p>
      <h1 className="sx-title">Карта целиком</h1>
      <p className="sx-lead">
        {done} из {PATH_NODES.length} узлов закрыто. Двигайтесь по маршруту — без кубков, только шаги.
      </p>

      <section className="sx-path-panel sx-glow">
        <ol className="sx-path sx-path-tall">
          {PATH_NODES.map((node, i) => (
            <li key={node.id} className={`sx-path-node is-${node.status}`}>
              {i > 0 ? <span className="sx-path-line" aria-hidden /> : null}
              <div className="sx-path-dot" aria-hidden>
                <span>{node.status === "done" ? "✓" : String(i + 1)}</span>
              </div>
              <div className="sx-path-label">
                <strong>{node.title}</strong>
                <span className="sx-muted">{node.detail}</span>
                {node.status !== "locked" && (
                  <Link to={node.ctaTo} className="sx-text-link" style={{ marginTop: 6 }}>
                    {node.cta} →
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {current && (
        <Link to={current.ctaTo} className="sx-cta sx-cta-block">
          {current.cta}
        </Link>
      )}

      <section className="sx-section">
        <h2>Сегодняшние сессии</h2>
        <ul className="sx-list">
          <li className="sx-list-row">
            <div>
              <strong>Силовая · верх</strong>
              <span className="sx-muted">42 мин</span>
            </div>
            <span className="sx-status is-done">Готово</span>
          </li>
          <li className="sx-list-row">
            <div>
              <strong>Мобилити</strong>
              <span className="sx-muted">20 мин · план</span>
            </div>
            <span className="sx-status">Открыть</span>
          </li>
        </ul>
        <Link to="/workouts" className="sx-text-link" style={{ marginTop: 8 }}>
          Материалы →
        </Link>
      </section>
    </div>
  );
}
