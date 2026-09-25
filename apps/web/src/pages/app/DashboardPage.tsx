import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../api/client";

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

type Balance = Awaited<ReturnType<typeof api.balance>>;

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);

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
  const minGoal = data?.withdrawalProgress.minAmountKgs ?? 1000;
  const savePct = Math.min(100, Math.round((balance / minGoal) * 100));

  const readiness = useMemo(() => {
    const a = holdPct * 0.4;
    const b = Math.min(100, streak * 12) * 0.25;
    const c = savePct * 0.35;
    return Math.round(a + b + c);
  }, [holdPct, streak, savePct]);

  const subjects = [
    { name: "Накопление", pct: savePct, to: "/progress", hint: `${formatSom(balance)} сом` },
    { name: "Выдержка", pct: holdPct, to: "/goal", hint: `${holdHave}/${holdNeed} мес.` },
    { name: "Серия", pct: Math.min(100, streak * 10), to: "/app/activity", hint: streak ? `${streak} мес.` : "не начата" },
    { name: "Материалы", pct: 62, to: "/workouts", hint: "практика" },
  ];

  const continueTo = !data?.membership ? "/memberships" : streak < 1 ? "/app/activity" : "/workouts";
  const continueLabel = !data?.membership ? "Оформить абонемент" : streak < 1 ? "Начать серию" : "Продолжить практику";

  if (loading) {
    return (
      <div className="uw-page" role="status">
        <div className="uw-skel uw-skel-lg" />
        <div className="uw-skel" />
        <div className="uw-skel" />
      </div>
    );
  }

  return (
    <div className="uw-page">
      <header className="uw-top">
        <div>
          <p className="uw-eyebrow">Личный кабинет</p>
          <h1 className="uw-h1">{user?.firstName ? `${user.firstName}` : "Обзор"}</h1>
        </div>
        <Link to="/profile" className="uw-ghost-btn">
          Профиль
        </Link>
      </header>

      <section className="uw-ready" aria-labelledby="ready-title">
        <div className="uw-ready-score" aria-labelledby="ready-title">
          <div className="uw-score-ring" style={{ ["--p" as string]: `${readiness}` }}>
            <span>{readiness}%</span>
          </div>
          <div>
            <h2 id="ready-title" className="uw-h2">
              Готовность к цели
            </h2>
            <p className="uw-sub">
              Сводный индекс: накопление, выдержка и серия — как readiness в учебном кабинете.
            </p>
          </div>
        </div>
        <Link to={continueTo} className="uw-primary">
          {continueLabel}
        </Link>
      </section>

      <section className="uw-panel">
        <div className="uw-panel-head">
          <h2 className="uw-h2">По блокам</h2>
          <span className="uw-sub">как subjects</span>
        </div>
        <ul className="uw-subjects">
          {subjects.map((s) => (
            <li key={s.name}>
              <Link to={s.to} className="uw-subject">
                <div className="uw-subject-top">
                  <strong>{s.name}</strong>
                  <span>{s.pct}%</span>
                </div>
                <div className="uw-bar" aria-hidden>
                  <span style={{ width: `${s.pct}%` }} />
                </div>
                <span className="uw-sub">{s.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="uw-stats">
        <div className="uw-stat">
          <span className="uw-sub">Баланс</span>
          <b>{formatSom(balance)}</b>
        </div>
        <div className="uw-stat">
          <span className="uw-sub">Серия</span>
          <b>{streak || 0}</b>
        </div>
        <div className="uw-stat">
          <span className="uw-sub">До вывода</span>
          <b>
            {holdHave}/{holdNeed}
          </b>
        </div>
      </section>

      <section className="uw-panel">
        <div className="uw-panel-head">
          <h2 className="uw-h2">К повторению</h2>
        </div>
        <ul className="uw-review">
          <li>
            <Link to="/schedule">Расписание тренировок</Link>
            <span className="uw-tag">сегодня</span>
          </li>
          <li>
            <Link to="/invites">Приглашения тренера</Link>
            <span className="uw-tag">inbox</span>
          </li>
          <li>
            <Link to="/goal">Условия цели</Link>
            <span className="uw-tag">правила</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
