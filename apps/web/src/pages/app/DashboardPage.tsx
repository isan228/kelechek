import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";

type Balance = Awaited<ReturnType<typeof api.balance>>;
type Schedule = Awaited<ReturnType<typeof api.mySchedule>>;

const YEAR_COLORS = ["#3ddc97", "#6f9bff", "#ffb84d", "#ff7a9c"];
const DAY_MS = 86_400_000;

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatSession(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(d) - startOf(today)) / DAY_MS);
  const time = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `Сегодня, ${time}`;
  if (diff === 1) return `Завтра, ${time}`;
  return `${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}, ${time}`;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

function yearProgress(streakMonths: number) {
  return [0, 1, 2, 3].map((i) => Math.max(0, Math.min(100, Math.round(((streakMonths - i * 12) / 12) * 100))));
}

function yearStatus(p: number) {
  if (p >= 100) return "завершён";
  if (p > 0) return `${p}%`;
  return "впереди";
}

function StreakRings({ progress }: { progress: number[] }) {
  return (
    <svg
      className="cab-rings"
      viewBox="0 0 220 220"
      role="img"
      aria-label={`Четыре года: ${progress.map((p) => `${p}%`).join(", ")}`}
    >
      {progress.map((p, i) => {
        const r = 96 - i * 20;
        const len = 2 * Math.PI * r;
        return (
          <g key={i}>
            <circle cx="110" cy="110" r={r} fill="none" stroke="var(--cab-track)" strokeWidth="12" />
            {p > 0 && (
              <circle
                cx="110"
                cy="110"
                r={r}
                fill="none"
                stroke={YEAR_COLORS[i]}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(len * p) / 100} ${len}`}
                transform="rotate(-90 110 110)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Balance | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void Promise.allSettled([api.balance(), api.mySchedule()]).then(([b, sc]) => {
      if (!alive) return;
      setData(b.status === "fulfilled" ? b.value : null);
      setSchedule(sc.status === "fulfilled" ? sc.value : null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="cab-page" role="status" aria-label="Загрузка">
        <div className="uw-skel" />
        <div className="uw-skel uw-skel-lg" />
        <div className="uw-skel" />
      </div>
    );
  }

  const name = user?.firstName || user?.login || "";
  const streak = data?.streak ?? 0;
  const progress = yearProgress(streak);
  const currentYear = Math.min(4, Math.floor(streak / 12) + 1);
  const membership = data?.membership ?? null;
  const daysLeft = membership
    ? Math.max(0, Math.ceil((new Date(membership.endsAtExclusive).getTime() - Date.now()) / DAY_MS))
    : null;
  const accrued = data?.balance.accrued ?? 0;
  const pathPct = Math.min(100, Math.round((streak / 48) * 100));

  const now = Date.now();
  const nextSession =
    schedule?.sessions
      .filter((x) => new Date(x.startsAt).getTime() > now && x.status !== "CANCELED")
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;
  const coach = schedule?.coach ?? null;
  const coachName = coach ? [coach.firstName, coach.lastName].filter(Boolean).join(" ") || "Тренер" : null;

  return (
    <div className="cab-page">
      <header className="cab-hello">
        <p className="cab-mut">
          {greeting()}
          {name ? `, ${name}` : ""}
        </p>
        <h1>{membership ? `Год ${currentYear}: держите ритм` : "Начните свой стрик"}</h1>
      </header>

      <div className="cab-grid">
        <section className="cab-card cab-s7" aria-labelledby="cab-streak-h">
          <h2 id="cab-streak-h" className="cab-h">Стрик · 4 года</h2>
          <div className="cab-streak">
            <StreakRings progress={progress} />
            <div className="cab-legend">
              {progress.map((p, i) => (
                <div key={i}>
                  <i style={{ background: YEAR_COLORS[i] }} aria-hidden />
                  Год {i + 1} — {yearStatus(p)}
                </div>
              ))}
              <p className="cab-mut cab-legend-sub">До конца Года {currentYear}</p>
              <p className="cab-big">
                {daysLeft ?? "—"}
                {daysLeft != null && <span> дней</span>}
              </p>
            </div>
          </div>
        </section>

        <section className="cab-card cab-s5" aria-labelledby="cab-refund-h">
          <h2 id="cab-refund-h" className="cab-h">Возврат</h2>
          <p className="cab-big">{formatSom(accrued)} с</p>
          <div className="cab-meter" aria-hidden>
            <i style={{ width: `${pathPct}%` }} />
          </div>
          <p className="cab-mut cab-small">{pathPct}% пути · выплата после Года 4</p>
          <Link to="/progress" className="cab-btn2 cab-mt">
            История начислений
          </Link>
        </section>

        <section className="cab-card cab-s4" aria-labelledby="cab-sub-h">
          <h2 id="cab-sub-h" className="cab-h">Абонемент</h2>
          {membership ? (
            <>
              <span className="cab-chip">● Активен</span>
              <p className="cab-line">до {formatDate(membership.endsAtExclusive)}</p>
              <Link to="/memberships" className="cab-btn2">
                Продлить
              </Link>
            </>
          ) : (
            <>
              <span className="cab-chip cab-chip-off">Не оформлен</span>
              <p className="cab-line">Оформите год — стрик начнётся сразу</p>
              <Link to="/memberships" className="cab-btn">
                Оформить
              </Link>
            </>
          )}
        </section>

        <section className="cab-card cab-s4" aria-labelledby="cab-next-h">
          <h2 id="cab-next-h" className="cab-h">Ближайшая тренировка</h2>
          {nextSession ? (
            <>
              <p className="cab-strong">{formatSession(nextSession.startsAt)}</p>
              <p className="cab-mut cab-line">
                {nextSession.title}
                {coachName ? ` · ${coachName}` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="cab-strong">Пока не запланирована</p>
              <p className="cab-mut cab-line">Расписание появится после выбора тренера</p>
            </>
          )}
          <Link to="/checkin" className="cab-btn cab-btn-wide">
            Отметиться
          </Link>
        </section>

        <section className="cab-card cab-s4" aria-labelledby="cab-coach-h">
          <h2 id="cab-coach-h" className="cab-h">Тренер</h2>
          {coach ? (
            <>
              <p className="cab-strong-sm">{coachName}</p>
              <p className="cab-mut cab-line">{coach.sportRu || "Персональные тренировки"}</p>
              <Link to="/invites" className="cab-btn2">
                Открыть
              </Link>
            </>
          ) : (
            <>
              <p className="cab-strong-sm">Не выбран</p>
              <p className="cab-mut cab-line">Можно заниматься самостоятельно или выбрать тренера</p>
              <Link to="/coaches" className="cab-btn2">
                Выбрать тренера
              </Link>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
