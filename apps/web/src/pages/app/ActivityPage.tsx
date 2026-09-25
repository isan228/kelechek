import { Link } from "react-router-dom";
import { PATH_NODES } from "../../app/investData";

export function ActivityPage() {
  const current = PATH_NODES.find((n) => n.status === "current");
  const done = PATH_NODES.filter((n) => n.status === "done").length;
  const pct = Math.round((done / PATH_NODES.length) * 100);

  return (
    <div className="sx-page">
      <p className="sx-kicker">Путь</p>
      <h1 className="sx-title">Ваши шаги</h1>
      <p className="sx-lead">
        {done} из {PATH_NODES.length} готово. Открывайте шаги по порядку.
      </p>

      <div className="sx-path-summary">
        <div className="sx-path-summary-row">
          <span className="sx-muted">Прогресс</span>
          <strong>{pct}%</strong>
        </div>
        <div className="sx-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ol className="sx-steps">
        {PATH_NODES.map((node, i) => {
          const locked = node.status === "locked";
          const isCurrent = node.status === "current";
          return (
            <li key={node.id} className={`sx-step is-${node.status}`}>
              <div className="sx-step-index" aria-hidden>
                {node.status === "done" ? "✓" : i + 1}
              </div>
              <div className="sx-step-body">
                <strong>{node.title}</strong>
                <span className="sx-muted">{isCurrent ? node.detail : node.hint}</span>
                {!locked && (
                  <Link to={node.ctaTo} className={isCurrent ? "sx-cta sx-cta-sm" : "sx-text-link"}>
                    {node.cta}
                    {isCurrent ? "" : " →"}
                  </Link>
                )}
                {locked && <span className="sx-step-lock">Сначала предыдущий шаг</span>}
              </div>
            </li>
          );
        })}
      </ol>

      {current && (
        <p className="sx-muted" style={{ margin: 0 }}>
          Сейчас: <b style={{ color: "var(--sx-ink)" }}>{current.title}</b>
        </p>
      )}
    </div>
  );
}
