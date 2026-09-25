import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";
import { IconBookmark, IconChat, IconHeart, IconHeartFill, IconMore, IconShare } from "../../components/UwIcons";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

type Balance = Awaited<ReturnType<typeof api.balance>>;

const stories = [
  { to: "/checkin", label: "Отметка", ring: true },
  { to: "/app/activity", label: "Тренировка", ring: true },
  { to: "/app/invest", label: "Инвест", ring: false },
  { to: "/schedule", label: "Расписание", ring: false },
  { to: "/memberships", label: "Абонемент", ring: false },
  { to: "/goal", label: "Цель", ring: false },
] as const;

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    let alive = true;
    void api
      .balance()
      .then((r) => {
        if (alive) setData(r);
      })
      .catch(() => {
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const holdNeed = data?.withdrawalProgress.holdingMonths ?? 12;
  const holdHave = data?.withdrawalProgress.monthsHeld ?? 0;
  const holdPct = Math.min(100, Math.round((holdHave / holdNeed) * 100));
  const streak = data?.streak ?? 0;
  const balance = data?.balance.available ?? 0;
  const name = user?.firstName || user?.login || "kelechek";

  const continueTo = !data?.membership ? "/memberships" : streak < 1 ? "/app/activity" : "/workouts";
  const continueLabel = !data?.membership
    ? "Оформить абонемент"
    : streak < 1
      ? "Начать серию"
      : "Продолжить практику";

  if (loading) {
    return (
      <div className="uw-page" role="status">
        <div className="uw-skel" />
        <div className="uw-skel uw-skel-lg" />
        <div className="uw-skel" />
      </div>
    );
  }

  return (
    <div className="uw-page uw-feed">
      <section className="uw-stories" aria-label="Быстрые действия">
        {stories.map((s) => (
          <Link key={s.to} to={s.to} className={`uw-story ${s.ring ? "is-new" : ""}`}>
            <span className="uw-story-ring">
              <span className="uw-story-ava">{s.label.slice(0, 1)}</span>
            </span>
            <span className="uw-story-label">{s.label}</span>
          </Link>
        ))}
      </section>

      <article className="uw-post">
        <header className="uw-post-head">
          <span className="uw-post-ava">{name.slice(0, 1).toUpperCase()}</span>
          <div className="uw-post-meta">
            <strong>{name}</strong>
            <span>баланс · сегодня</span>
          </div>
          <Link to="/progress" className="uw-post-more" aria-label="Ещё">
            <IconMore />
          </Link>
        </header>
        <div className="uw-post-hero">
          <p className="uw-post-kicker">Доступно</p>
          <p className="uw-post-amount">{formatSom(balance)} сом</p>
          <p className="uw-post-sub">
            Серия {streak || 0} мес. · до вывода {holdHave}/{holdNeed}
          </p>
        </div>
        <div className="uw-post-actions">
          <button
            type="button"
            className={`uw-ico-btn ${liked ? "is-on" : ""}`}
            onClick={() => setLiked((v) => !v)}
            aria-label="Нравится"
          >
            {liked ? <IconHeartFill /> : <IconHeart />}
          </button>
          <Link to="/app/invest" className="uw-ico-btn" aria-label="Инвестиции">
            <IconChat />
          </Link>
          <Link to={continueTo} className="uw-ico-btn" aria-label="Продолжить">
            <IconShare />
          </Link>
          <Link to="/goal" className="uw-ico-btn uw-ico-end" aria-label="Цель">
            <IconBookmark />
          </Link>
        </div>
        <div className="uw-post-caption">
          <strong>{name}</strong> {continueLabel.toLowerCase()} —{" "}
          <Link to={continueTo}>{continueLabel}</Link>
        </div>
        <div className="uw-bar uw-bar-feed" aria-hidden>
          <span style={{ width: `${holdPct}%` }} />
        </div>
      </article>

      <article className="uw-post">
        <header className="uw-post-head">
          <span className="uw-post-ava uw-post-ava-brand">K</span>
          <div className="uw-post-meta">
            <strong>kelechek</strong>
            <span>активность</span>
          </div>
        </header>
        <ul className="uw-post-list">
          <li>
            <Link to="/schedule">Расписание тренировок</Link>
            <span>сегодня</span>
          </li>
          <li>
            <Link to="/invites">Приглашения тренера</Link>
            <span>входящие</span>
          </li>
          <li>
            <Link to="/workouts">Материалы и программы</Link>
            <span>лента</span>
          </li>
        </ul>
      </article>

      <article className="uw-post">
        <header className="uw-post-head">
          <span className="uw-post-ava">P</span>
          <div className="uw-post-meta">
            <strong>прогресс</strong>
            <span>к цели</span>
          </div>
        </header>
        <div className="uw-stats uw-stats-feed">
          <div className="uw-stat">
            <span className="uw-sub">Баланс</span>
            <b>{formatSom(balance)}</b>
          </div>
          <div className="uw-stat">
            <span className="uw-sub">Серия</span>
            <b>{streak || 0}</b>
          </div>
          <div className="uw-stat">
            <span className="uw-sub">Выдержка</span>
            <b>
              {holdHave}/{holdNeed}
            </b>
          </div>
        </div>
      </article>
    </div>
  );
}
