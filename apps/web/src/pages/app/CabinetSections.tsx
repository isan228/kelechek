import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthProvider";

type Invitations = Awaited<ReturnType<typeof api.invitations>>;
type Schedule = Awaited<ReturnType<typeof api.mySchedule>>;
type Balance = Awaited<ReturnType<typeof api.balance>>;

const WEEKDAYS = ["", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function personName(p: { firstName: string | null; lastName: string | null; phone?: string }) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.phone || "—";
}

function formatSom(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

function formatDt(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function Skeleton() {
  return (
    <div className="cab-page" role="status" aria-label="Загрузка">
      <div className="uw-skel" />
      <div className="uw-skel uw-skel-lg" />
    </div>
  );
}

function PageHead({ kicker, title }: { kicker: string; title: string }) {
  return (
    <header className="cab-hello">
      <p className="cab-mut">{kicker}</p>
      <h1>{title}</h1>
    </header>
  );
}

/* ---------- Тренер ---------- */

export function CabCoachPage() {
  const [inv, setInv] = useState<Invitations | null>(null);
  const [sched, setSched] = useState<Schedule | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [a, b] = await Promise.allSettled([api.invitations(), api.mySchedule()]);
    setInv(a.status === "fulfilled" ? a.value : { invites: [], relation: null });
    setSched(b.status === "fulfilled" ? b.value : null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!inv) return <Skeleton />;

  const coach = inv.relation?.coach ?? null;
  const sport = sched?.coach?.sportRu || null;
  const slots = sched?.weeklySlots ?? [];

  return (
    <div className="cab-page">
      <PageHead kicker="Тренер" title={coach ? "Ваш тренер" : "Тренер не выбран"} />

      <div className="cab-grid">
        <section className="cab-card cab-s7" aria-labelledby="cc-h">
          <h2 id="cc-h" className="cab-h">Текущий тренер</h2>
          {coach ? (
            <div className="cab-person">
              <span className="cab-person-ava">{personName(coach).slice(0, 1).toUpperCase()}</span>
              <div>
                <p className="cab-strong">{personName(coach)}</p>
                <p className="cab-mut">{sport || "Персональные тренировки"}</p>
              </div>
            </div>
          ) : (
            <p className="cab-line cab-mut">
              Можно заниматься самостоятельно. Если нужен человек рядом — выберите тренера или примите приглашение.
            </p>
          )}
          <div className="cab-actions">
            <Link to="/coaches" className={coach ? "cab-btn2" : "cab-btn"}>
              {coach ? "Сменить тренера" : "Выбрать тренера"}
            </Link>
            {coach && (
              <button
                type="button"
                className="cab-btn-ghost"
                disabled={busy}
                onClick={() => void run(() => api.endRelation())}
              >
                Завершить работу
              </button>
            )}
          </div>
        </section>

        <section className="cab-card cab-s5" aria-labelledby="cs-h">
          <h2 id="cs-h" className="cab-h">Занятия по неделе</h2>
          {slots.length ? (
            <ul className="cab-list">
              {slots.map((s) => (
                <li key={s.id}>
                  <span className="cab-tag">{WEEKDAYS[s.weekday] ?? "—"}</span>
                  <span className="cab-list-main">{s.title}</span>
                  <span className="cab-mut cab-num">
                    {s.startHm}–{s.endHm}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cab-mut">Тренер ещё не задал постоянное расписание.</p>
          )}
        </section>

        <section className="cab-card cab-s12" aria-labelledby="ci-h">
          <h2 id="ci-h" className="cab-h">Приглашения · {inv.invites.length}</h2>
          {inv.invites.length === 0 ? (
            <p className="cab-mut">Новых приглашений нет.</p>
          ) : (
            <ul className="cab-list cab-list-roomy">
              {inv.invites.map((i) => (
                <li key={i.id}>
                  <span className="cab-person-ava cab-person-ava-sm">
                    {personName(i.coach).slice(0, 1).toUpperCase()}
                  </span>
                  <span className="cab-list-main">
                    <strong>{personName(i.coach)}</strong>
                    {coach && <small className="cab-mut">Текущий тренер будет заменён</small>}
                  </span>
                  <span className="cab-row-btns">
                    <button
                      type="button"
                      className="cab-btn-solid"
                      disabled={busy}
                      onClick={() => void run(() => api.respondInvite(i.id, true, Boolean(coach)))}
                    >
                      Принять
                    </button>
                    <button
                      type="button"
                      className="cab-btn-ghost"
                      disabled={busy}
                      onClick={() => void run(() => api.respondInvite(i.id, false))}
                    >
                      Отклонить
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------- Тренировки ---------- */

export function CabTrainingPage() {
  const [data, setData] = useState<Schedule | null>(null);

  useEffect(() => {
    void api
      .mySchedule()
      .then(setData)
      .catch(() => setData({ coach: null, sessions: [], weeklySlots: [] }));
  }, []);

  if (!data) return <Skeleton />;

  const now = Date.now();
  const sessions = [...data.sessions].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );
  const upcoming = sessions.filter((s) => new Date(s.startsAt).getTime() > now && s.status !== "CANCELED");
  const past = sessions.filter((s) => new Date(s.startsAt).getTime() <= now).reverse();
  const attended = past.filter((s) => s.attended).length;
  const rate = past.length ? Math.round((attended / past.length) * 100) : 0;
  const next = upcoming[0] ?? null;

  return (
    <div className="cab-page">
      <PageHead kicker="Тренировки" title="Расписание и посещения" />

      <div className="cab-grid">
        <section className="cab-card cab-s4" aria-labelledby="tn-h">
          <h2 id="tn-h" className="cab-h">Следующая</h2>
          <p className="cab-strong">{next ? formatDt(next.startsAt) : "Не запланирована"}</p>
          <p className="cab-mut cab-line">{next ? next.title : "Расписание появится после выбора тренера"}</p>
          <Link to="/checkin" className="cab-btn cab-btn-wide">
            Отметиться
          </Link>
        </section>

        <section className="cab-card cab-s4" aria-labelledby="ta-h">
          <h2 id="ta-h" className="cab-h">Посещено</h2>
          <p className="cab-big">
            {attended}
            <span> из {past.length}</span>
          </p>
          <div className="cab-meter" aria-hidden>
            <i style={{ width: `${rate}%` }} />
          </div>
          <p className="cab-mut cab-small">{rate}% прошедших занятий</p>
        </section>

        <section className="cab-card cab-s4" aria-labelledby="tu-h">
          <h2 id="tu-h" className="cab-h">Впереди</h2>
          <p className="cab-big">
            {upcoming.length}
            <span> занятий</span>
          </p>
          <p className="cab-mut cab-line">
            {data.weeklySlots.length ? `${data.weeklySlots.length} постоянных слота в неделю` : "Без постоянного расписания"}
          </p>
          <Link to="/workouts" className="cab-btn2">
            Материалы и программы
          </Link>
        </section>

        <section className="cab-card cab-s7" aria-labelledby="tl-h">
          <h2 id="tl-h" className="cab-h">Ближайшие занятия</h2>
          {upcoming.length ? (
            <ul className="cab-list">
              {upcoming.slice(0, 8).map((s) => (
                <li key={s.id}>
                  <span className="cab-dot cab-dot-now" aria-hidden />
                  <span className="cab-list-main">
                    <strong>{s.title}</strong>
                    <small className="cab-mut">{formatDt(s.startsAt)}</small>
                  </span>
                  {s.fromWeekly && <span className="cab-tag">по неделе</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="cab-mut">Запланированных занятий пока нет.</p>
          )}
        </section>

        <section className="cab-card cab-s5" aria-labelledby="th-h">
          <h2 id="th-h" className="cab-h">История</h2>
          {past.length ? (
            <ul className="cab-list">
              {past.slice(0, 8).map((s) => (
                <li key={s.id}>
                  <span className={`cab-dot ${s.attended ? "cab-dot-ok" : ""}`} aria-hidden>
                    {s.attended ? "✓" : ""}
                  </span>
                  <span className="cab-list-main">
                    <strong>{s.title}</strong>
                    <small className="cab-mut">{formatDt(s.startsAt)}</small>
                  </span>
                  <span className={`cab-tag ${s.attended ? "cab-tag-ok" : ""}`}>
                    {s.attended ? "был" : "пропуск"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="cab-mut">Прошедших занятий пока нет.</p>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------- Поступление ---------- */

const ADMISSION_STEPS = [
  { t: "Партнёрские вузы", d: "Список учебных заведений с договорённостями о спортивных льготах." },
  { t: "Спортивное портфолио", d: "Серия, посещения и справки собираются в пакет для приёмной комиссии." },
  { t: "Сопровождение", d: "Подсказки по документам и срокам подачи — без лишней бюрократии." },
];

export function CabAdmissionPage() {
  const [data, setData] = useState<Balance | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void api
      .balance()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return <Skeleton />;

  const have = data?.balance.available ?? 0;
  const min = data?.withdrawalProgress.minAmountKgs ?? 1000;
  const held = data?.withdrawalProgress.monthsHeld ?? 0;
  const need = data?.withdrawalProgress.holdingMonths ?? 12;
  const amountPct = Math.min(100, Math.round((have / Math.max(1, min)) * 100));
  const holdPct = Math.min(100, Math.round((held / Math.max(1, need)) * 100));
  const streak = data?.streak ?? 0;

  const checks = [
    { ok: Boolean(data?.membership), label: "Активный абонемент" },
    { ok: data?.withdrawalProgress.holdingPassed ?? false, label: `Выдержка ${need} мес. (${held}/${need})` },
    {
      ok: data?.withdrawalProgress.minAmountPassed ?? false,
      label: `Накоплено от ${formatSom(min)} с`,
    },
    { ok: false, label: "Справка о зачислении в учебное заведение" },
  ];
  const done = checks.filter((c) => c.ok).length;

  return (
    <div className="cab-page">
      <PageHead kicker="Поступление" title="Путь к учёбе" />

      <div className="cab-grid">
        <section className="cab-card cab-s7" aria-labelledby="ad-h">
          <h2 id="ad-h" className="cab-h">Накоплено на образование</h2>
          <p className="cab-big">{formatSom(have)} с</p>
          <div className="cab-meter" aria-hidden>
            <i style={{ width: `${amountPct}%` }} />
          </div>
          <p className="cab-mut cab-small">
            {amountPct}% от минимальной суммы {formatSom(min)} с · выдержка {holdPct}%
          </p>
          <div className="cab-kpis">
            <div>
              <b>{streak}</b>
              <span>мес. серии</span>
            </div>
            <div>
              <b>
                {held}/{need}
              </b>
              <span>выдержка</span>
            </div>
            <div>
              <b>
                {done}/{checks.length}
              </b>
              <span>условий</span>
            </div>
          </div>
        </section>

        <section className="cab-card cab-s5" aria-labelledby="ac-h">
          <h2 id="ac-h" className="cab-h">Условия заявки</h2>
          <ul className="cab-checks">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? "is-ok" : ""}>
                <span className="cab-dot" aria-hidden>
                  {c.ok ? "✓" : ""}
                </span>
                {c.label}
              </li>
            ))}
          </ul>
          <Link to="/progress" className="cab-btn2 cab-mt">
            История начислений
          </Link>
        </section>

        <section className="cab-card cab-s12" aria-labelledby="as-h">
          <h2 id="as-h" className="cab-h">Как платформа помогает с поступлением</h2>
          <ol className="cab-steps">
            {ADMISSION_STEPS.map((s, i) => (
              <li key={s.t}>
                <b>{i + 1}</b>
                <div>
                  <strong>{s.t}</strong>
                  <span className="cab-mut">{s.d}</span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

/* ---------- Профиль ---------- */

export function CabProfilePage() {
  const { i18n } = useTranslation();
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [membership, setMembership] = useState<Balance["membership"] | undefined>(undefined);

  useEffect(() => {
    void api
      .balance()
      .then((r) => setMembership(r.membership))
      .catch(() => setMembership(null));
  }, []);

  async function save() {
    setBusy(true);
    try {
      const res = await api.patchMe({ firstName, lastName });
      setUser(res.user);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  }

  async function setLang(locale: "ru" | "ky") {
    await i18n.changeLanguage(locale);
    try {
      const res = await api.patchMe({ locale });
      setUser(res.user);
    } catch {
      /* ignore */
    }
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      /* ignore */
    }
    setUser(null);
    navigate("/", { replace: true });
  }

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.login || "Аккаунт";
  const locale = user?.locale ?? "ru";

  return (
    <div className="cab-page">
      <PageHead kicker="Профиль" title="Аккаунт и настройки" />

      <div className="cab-grid">
        <section className="cab-card cab-s5" aria-labelledby="pi-h">
          <h2 id="pi-h" className="cab-h">Вы</h2>
          <div className="cab-person">
            <span className="cab-person-ava">{name.slice(0, 1).toUpperCase()}</span>
            <div>
              <p className="cab-strong">{name}</p>
              <p className="cab-mut">{user?.phone}</p>
            </div>
          </div>
          <dl className="cab-dl">
            {user?.login && (
              <>
                <dt>Логин</dt>
                <dd>{user.login}</dd>
              </>
            )}
            <dt>Абонемент</dt>
            <dd>
              {membership === undefined
                ? "…"
                : membership
                  ? `до ${new Date(membership.endsAtExclusive).toLocaleDateString("ru-RU")}`
                  : "не оформлен"}
            </dd>
          </dl>
          <button type="button" className="cab-btn-ghost cab-btn-danger cab-mt" onClick={() => void logout()}>
            Выйти из аккаунта
          </button>
        </section>

        <section className="cab-card cab-s7" aria-labelledby="pe-h">
          <h2 id="pe-h" className="cab-h">Личные данные</h2>
          <form
            className="cab-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <label>
              <span>Имя</span>
              <input
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setSaved(false);
                }}
                autoComplete="given-name"
              />
            </label>
            <label>
              <span>Фамилия</span>
              <input
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setSaved(false);
                }}
                autoComplete="family-name"
              />
            </label>
            <div className="cab-form-foot">
              <button type="submit" className="cab-btn-solid" disabled={busy}>
                Сохранить
              </button>
              {saved && <span className="cab-ok">Сохранено</span>}
            </div>
          </form>
        </section>

        <section className="cab-card cab-s6" aria-labelledby="pl-h">
          <h2 id="pl-h" className="cab-h">Язык</h2>
          <div className="cab-seg" role="group" aria-label="Язык интерфейса">
            <button
              type="button"
              className={locale === "ru" ? "cab-seg-btn is-on" : "cab-seg-btn"}
              aria-pressed={locale === "ru"}
              onClick={() => void setLang("ru")}
            >
              Русский
            </button>
            <button
              type="button"
              className={locale === "ky" ? "cab-seg-btn is-on" : "cab-seg-btn"}
              aria-pressed={locale === "ky"}
              onClick={() => void setLang("ky")}
            >
              Кыргызча
            </button>
          </div>
        </section>

        <section className="cab-card cab-s6" aria-labelledby="pq-h">
          <h2 id="pq-h" className="cab-h">Быстрые ссылки</h2>
          <nav className="cab-links">
            <Link to="/memberships">Абонемент и оплата</Link>
            <Link to="/progress">История начислений</Link>
            <Link to="/notifications">Уведомления</Link>
            <Link to="/">На сайт</Link>
          </nav>
        </section>
      </div>
    </div>
  );
}
