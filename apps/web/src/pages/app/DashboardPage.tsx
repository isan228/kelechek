import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";
import { CIRCLE, PATH_NODES, getOnboardingGoal } from "../../app/investData";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

export function DashboardPage() {
  const { user } = useAuth();
  const goal = getOnboardingGoal() ?? "both";
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeNode, setActiveNode] = useState(() => PATH_NODES.find((n) => n.status === "current")?.id ?? PATH_NODES[0]?.id);

  useEffect(() => {
    let alive = true;
    void api
      .balance()
      .then((r) => {
        if (alive) setBalance(r.balance.available);
      })
      .catch(() => {
        if (alive) setBalance(24850);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const current = PATH_NODES.find((n) => n.id === activeNode) ?? PATH_NODES.find((n) => n.status === "current");
  const doneCount = PATH_NODES.filter((n) => n.status === "done").length;

  if (loading) {
    return (
      <div className="sx-page" role="status" aria-label="Загрузка">
        <div className="sx-skeleton sx-skeleton-lg" />
        <div className="sx-skeleton" />
        <div className="sx-skeleton sx-skeleton-card" />
      </div>
    );
  }

  return (
    <div className="sx-page sx-home-circle">
      <header className="sx-dash-head">
        <div>
          <p className="sx-kicker">Ваш круг</p>
          <h1 className="sx-hello">{user?.firstName ? `${user.firstName}, вы в пути` : "Ваш круг"}</h1>
        </div>
        <Link to="/app/portfolio" className="sx-avatar" aria-label="Профиль">
          {(user?.firstName?.[0] || "K").toUpperCase()}
        </Link>
      </header>

      <section className="sx-circle" aria-label="Люди в круге">
        <div className="sx-circle-rail">
          {CIRCLE.map((person) => {
            const inner = (
              <>
                <span className={`sx-circle-ava ${person.role === "you" ? "is-you" : ""}`} aria-hidden>
                  {person.initials}
                </span>
                <span className="sx-circle-name">{person.name}</span>
                <span className="sx-circle-role">{person.subtitle}</span>
                {person.pulse ? <span className="sx-circle-pulse">{person.pulse}</span> : null}
              </>
            );
            if (person.to) {
              return (
                <Link key={person.id} to={person.to} className="sx-circle-person">
                  {inner}
                </Link>
              );
            }
            return (
              <div key={person.id} className="sx-circle-person">
                {inner}
              </div>
            );
          })}
          <button type="button" className="sx-circle-person sx-circle-invite" aria-label="Пригласить в круг">
            <span className="sx-circle-ava is-invite" aria-hidden>
              +
            </span>
            <span className="sx-circle-name">Пригласить</span>
            <span className="sx-circle-role">расширить круг</span>
          </button>
        </div>
      </section>

      <section className="sx-path-panel sx-glow" aria-labelledby="path-title">
        <div className="sx-section-head">
          <h2 id="path-title">Карта пути</h2>
          <span className="sx-muted">
            {doneCount}/{PATH_NODES.length}
          </span>
        </div>
        <p className="sx-lead" style={{ maxWidth: "none" }}>
          Узлы — цели, не награды. Тапните узел, чтобы увидеть следующий шаг.
        </p>

        <ol className="sx-path">
          {PATH_NODES.map((node, i) => (
            <li key={node.id} className={`sx-path-node is-${node.status}`}>
              {i > 0 ? <span className="sx-path-line" aria-hidden /> : null}
              <button
                type="button"
                className={`sx-path-dot ${activeNode === node.id ? "is-focus" : ""}`}
                onClick={() => setActiveNode(node.id)}
                aria-current={node.status === "current" ? "step" : undefined}
                aria-label={`${node.title}, ${node.status === "done" ? "готово" : node.status === "current" ? "сейчас" : "дальше"}`}
              >
                <span>{node.status === "done" ? "✓" : String(i + 1)}</span>
              </button>
              <button type="button" className="sx-path-label" onClick={() => setActiveNode(node.id)}>
                <strong>{node.title}</strong>
                <span className="sx-muted">{node.hint}</span>
              </button>
            </li>
          ))}
        </ol>

        {current && (
          <div className="sx-path-detail">
            <p className="sx-metric-label">Сейчас в фокусе</p>
            <h3 className="sx-path-detail-title">{current.title}</h3>
            <p className="sx-muted">{current.detail}</p>
            <Link to={current.ctaTo} className="sx-cta sx-cta-block">
              {current.cta}
            </Link>
          </div>
        )}
      </section>

      {(goal === "invest" || goal === "both") && (
        <section className="sx-section">
          <div className="sx-mini-balance">
            <div>
              <p className="sx-metric-label">Накоплено в круге</p>
              <p className="sx-mini-value">{formatSom(balance ?? 0)} сом</p>
            </div>
            <Link to="/app/invest" className="sx-text-link">
              Рынок →
            </Link>
          </div>
        </section>
      )}

      <section className="sx-section" aria-labelledby="feed-title">
        <div className="sx-section-head">
          <h2 id="feed-title">Живой круг</h2>
        </div>
        <ul className="sx-feed">
          <li>
            <b>Айгуль</b> обновила серию тренировок · <span className="sx-muted">2ч</span>
          </li>
          <li>
            <b>Тимур</b> закрыл узел «Серия 7» · <span className="sx-muted">вчера</span>
          </li>
          <li>
            <b>Вы</b> в круге с тренером · <span className="sx-muted">на этой неделе</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
