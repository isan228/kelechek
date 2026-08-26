import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { Html5Qrcode } from "html5-qrcode";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

function formatDt(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "ky" ? "ky-KG" : "ru-KG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

function weekdayLabel(t: (k: string) => string, day: number) {
  return t(`schedule.weekday${day}`);
}

export function CoachWeeklyPanel({ onChanged }: { onChanged?: () => void }) {
  const { t } = useTranslation();
  const [slots, setSlots] = useState<Awaited<ReturnType<typeof api.coachWeeklySlots>>["slots"]>([]);
  const [weekday, setWeekday] = useState(1);
  const [startHm, setStartHm] = useState("18:00");
  const [endHm, setEndHm] = useState("19:30");
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api.coachWeeklySlots();
    setSlots(r.slots.filter((s) => s.isActive));
  }

  useEffect(() => {
    void load().catch(() => setSlots([]));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.coachCreateWeeklySlot({
        weekday,
        startHm,
        endHm,
        title: title || t("schedule.defaultTitle"),
      });
      setTitle("");
      await load();
      onChanged?.();
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : "";
      if (msg === "INVALID_TIME") setErr(t("schedule.invalidTime"));
      else if (msg === "INVALID_WEEKDAY") setErr(t("schedule.invalidWeekday"));
      else setErr(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await api.coachDeleteWeeklySlot(id);
      await load();
      onChanged?.();
    } catch {
      setErr(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="coach-panel-grid">
      <article className="coach-panel">
        <h3>{t("schedule.weeklyTitle")}</h3>
        <p className="muted">{t("schedule.weeklyLead")}</p>
        <form className="coach-form" onSubmit={(e) => void create(e)}>
          <label>
            {t("schedule.weekday")}
            <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
              {WEEKDAYS.map((d) => (
                <option key={d} value={d}>
                  {weekdayLabel(t, d)}
                </option>
              ))}
            </select>
          </label>
          <div className="coach-time-row">
            <label>
              {t("schedule.starts")}
              <input type="time" value={startHm} onChange={(e) => setStartHm(e.target.value)} required />
            </label>
            <label>
              {t("schedule.ends")}
              <input type="time" value={endHm} onChange={(e) => setEndHm(e.target.value)} required />
            </label>
          </div>
          <label>
            {t("schedule.sessionTitle")}
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("schedule.defaultTitle")} />
          </label>
          {err && <p className="error">{err}</p>}
          <button type="submit" disabled={busy}>
            {t("schedule.weeklySave")}
          </button>
        </form>
      </article>

      <article className="coach-panel">
        <h3>{t("schedule.weeklyList")}</h3>
        {slots.length === 0 && <p className="muted">{t("schedule.weeklyEmpty")}</p>}
        <ul className="coach-session-list">
          {slots.map((s) => (
            <li key={s.id} className="coach-session-item">
              <div className="coach-session-main">
                <strong>{s.title}</strong>
                <span className="muted">
                  {weekdayLabel(t, s.weekday)} · {s.startHm}–{s.endHm}
                </span>
              </div>
              <button type="button" className="ghost" disabled={busy} onClick={() => void remove(s.id)}>
                {t("schedule.weeklyRemove")}
              </button>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}

export function CoachSchedulePanel({ onChanged }: { onChanged?: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof api.coachSessions>>["sessions"]>([]);
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(() => toLocalInput(new Date(Date.now() + 3600_000)));
  const [endsAt, setEndsAt] = useState(() => toLocalInput(new Date(Date.now() + 7200_000)));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkInId, setCheckInId] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [present, setPresent] = useState<
    Awaited<ReturnType<typeof api.coachSessionQr>>["present"]
  >([]);

  async function load() {
    const r = await api.coachSessions();
    setSessions(r.sessions);
  }

  useEffect(() => {
    void load().catch(() => setSessions([]));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await api.coachCreateSession({
        title: title || t("schedule.defaultTitle"),
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      setTitle("");
      await load();
      onChanged?.();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await api.coachDeleteSession(id);
      if (checkInId === id) {
        setCheckInId(null);
        setQrUrl(null);
      }
      await load();
      onChanged?.();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function openCheckIn(id: string) {
    setErr(null);
    setBusy(true);
    try {
      const r = await api.coachSessionQr(id);
      const dataUrl = await QRCode.toDataURL(r.joinUrl, { width: 300, margin: 2 });
      setCheckInId(id);
      setQrUrl(dataUrl);
      setPresent(r.present);
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : "";
      if (msg === "CHECKIN_TOO_EARLY") setErr(t("schedule.checkinEarly"));
      else if (msg === "CHECKIN_CLOSED") setErr(t("schedule.checkinClosed"));
      else setErr(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="coach-schedule-block">
      <CoachWeeklyPanel onChanged={() => void load().then(() => onChanged?.())} />

      <div className="coach-panel-grid" style={{ marginTop: "1.2rem" }}>
        <article className="coach-panel">
          <h3>{t("schedule.createTitle")}</h3>
          <p className="muted">{t("schedule.createLead")}</p>
          <form className="coach-form" onSubmit={(e) => void create(e)}>
            <label>
              {t("schedule.sessionTitle")}
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("schedule.defaultTitle")} />
            </label>
            <label>
              {t("schedule.starts")}
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
            </label>
            <label>
              {t("schedule.ends")}
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} required />
            </label>
            {err && <p className="error">{err}</p>}
            <button type="submit" disabled={busy}>
              {t("schedule.save")}
            </button>
          </form>
        </article>

        <article className="coach-panel">
          <h3>{t("schedule.listTitle")}</h3>
          {sessions.length === 0 && <p className="muted">{t("schedule.empty")}</p>}
          <ul className="coach-session-list">
            {sessions.map((s) => (
              <li key={s.id} className="coach-session-item">
                <div className="coach-session-main">
                  <strong>
                    {s.title}
                    {s.fromWeekly ? (
                      <span className="coach-pill">{t("schedule.fromWeekly")}</span>
                    ) : null}
                  </strong>
                  <span className="muted">
                    {formatDt(s.startsAt, locale)} — {formatDt(s.endsAt, locale)}
                  </span>
                  <span className="muted">{t("schedule.presentCount", { count: s.presentCount })}</span>
                </div>
                <div className="coach-session-actions">
                  <button type="button" disabled={busy} onClick={() => void openCheckIn(s.id)}>
                    {t("schedule.checkinQr")}
                  </button>
                  {!s.fromWeekly && (
                    <button type="button" className="ghost" disabled={busy} onClick={() => void remove(s.id)}>
                      {t("admin.cancel")}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {checkInId && qrUrl && (
        <article className="coach-panel" style={{ marginTop: "1.2rem" }}>
          <h3>{t("schedule.checkinTitle")}</h3>
          <p className="muted">{t("schedule.checkinLead")}</p>
          <div className="coach-qr-wrap">
            <img src={qrUrl} alt="check-in QR" className="coach-qr-img" />
            <div>
              <p>{t("schedule.presentNow", { count: present.length })}</p>
              <ul className="list">
                {present.map((p) => (
                  <li key={p.id}>
                    {[p.firstName, p.lastName].filter(Boolean).join(" ") || p.phone}
                  </li>
                ))}
              </ul>
              <button type="button" className="ghost" onClick={() => void openCheckIn(checkInId)}>
                {t("schedule.refreshPresent")}
              </button>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}

export function CoachHistoryPanel() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [traineeTotal, setTraineeTotal] = useState(0);
  const [sessions, setSessions] = useState<
    Awaited<ReturnType<typeof api.coachSessionsHistory>>["sessions"]
  >([]);

  useEffect(() => {
    void api
      .coachSessionsHistory()
      .then((r) => {
        setSessions(r.sessions);
        setTraineeTotal(r.traineeTotal);
      })
      .catch(() => setSessions([]));
  }, []);

  return (
    <div className="coach-panel">
      <h3>{t("schedule.historyTitle")}</h3>
      <p className="muted">{t("schedule.historyLead")}</p>
      {sessions.length === 0 && <p className="muted">{t("schedule.historyEmpty")}</p>}
      <ul className="coach-session-list">
        {sessions.map((s) => (
          <li key={s.id} className="coach-session-item">
            <div className="coach-session-main">
              <strong>
                {s.title}
                {s.fromWeekly ? <span className="coach-pill">{t("schedule.fromWeekly")}</span> : null}
              </strong>
              <span className="muted">{formatDt(s.startsAt, locale)}</span>
            </div>
            <div className="coach-history-stat">
              <b>
                {s.presentCount}
                {traineeTotal > 0 ? ` / ${traineeTotal}` : ""}
              </b>
              <span className="muted">{t("schedule.historyPresent")}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TraineeSchedulePage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [data, setData] = useState<Awaited<ReturnType<typeof api.mySchedule>> | null>(null);

  useEffect(() => {
    if (user)
      void api.mySchedule().then(setData).catch(() => setData({ coach: null, sessions: [], weeklySlots: [] }));
  }, [user]);

  if (loading) return null;

  const sport =
    locale === "ky"
      ? data?.coach?.sportKy || data?.coach?.sportRu
      : data?.coach?.sportRu || data?.coach?.sportKy;

  return (
    <div className="wrap section">
      <p className="kicker">{t("schedule.kicker")}</p>
      <h1>{t("schedule.myTitle")}</h1>
      {!data?.coach ? (
        <p className="lead">{t("schedule.noCoach")}</p>
      ) : (
        <p className="lead">
          {t("schedule.withCoach", {
            name: [data.coach.firstName, data.coach.lastName].filter(Boolean).join(" ") || "—",
            sport: sport || t("schedule.sportUnknown"),
          })}
        </p>
      )}
      <div className="row" style={{ marginBottom: "1rem" }}>
        <Link to="/checkin">
          <button type="button">{t("nav.checkin")}</button>
        </Link>
      </div>

      {data?.coach && (data.weeklySlots?.length ?? 0) > 0 && (
        <div className="coach-panel" style={{ marginBottom: "1.2rem" }}>
          <h2>{t("schedule.weeklyList")}</h2>
          <ul className="coach-session-list">
            {data.weeklySlots.map((s) => (
              <li key={s.id} className="coach-session-item">
                <div className="coach-session-main">
                  <strong>{s.title}</strong>
                  <span className="muted">
                    {weekdayLabel(t, s.weekday)} · {s.startHm}–{s.endHm}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="coach-panel">
        <h2>{t("schedule.listTitle")}</h2>
        {data?.sessions.length === 0 && <p className="muted">{t("schedule.emptyTrainee")}</p>}
        <ul className="coach-session-list">
          {data?.sessions.map((s) => (
            <li key={s.id} className="coach-session-item">
              <div className="coach-session-main">
                <strong>
                  {s.title}
                  {s.fromWeekly ? <span className="coach-pill">{t("schedule.fromWeekly")}</span> : null}
                </strong>
                <span className="muted">
                  {formatDt(s.startsAt, locale)} — {formatDt(s.endsAt, locale)}
                </span>
              </div>
              <span className="badge">{s.attended ? t("schedule.attended") : t("schedule.notAttended")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CheckInPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(params.get("t") ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const boxId = "session-checkin-reader";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const tkn = params.get("t");
      navigate(tkn ? `/login?next=${encodeURIComponent(`/checkin?t=${tkn}`)}` : "/login", { replace: true });
    }
  }, [user, loading, navigate, params]);

  useEffect(() => {
    return () => {
      void stopScan();
    };
  }, []);

  async function stopScan() {
    const s = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (s) {
      try {
        if (s.isScanning) await s.stop();
        await s.clear();
      } catch {
        /* ignore */
      }
    }
  }

  async function startScan() {
    setErr(null);
    setOk(null);
    await stopScan();
    setScanning(true);
    const scanner = new Html5Qrcode(boxId);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          void submit(decoded);
        },
        () => undefined,
      );
    } catch {
      setScanning(false);
      setErr(t("join.cameraError"));
    }
  }

  async function submit(raw: string) {
    if (!raw.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await stopScan();
      const res = await api.checkIn(raw.trim());
      setOk(res.already ? t("schedule.checkinAlready") : t("schedule.checkinOk", { title: res.session.title }));
    } catch (ex) {
      const msg = ex instanceof Error ? ex.message : "";
      if (msg === "INVALID_OR_EXPIRED_QR") setErr(t("schedule.checkinBadQr"));
      else if (msg === "NOT_YOUR_COACH") setErr(t("schedule.checkinNotYours"));
      else if (msg === "CHECKIN_TOO_EARLY") setErr(t("schedule.checkinEarly"));
      else if (msg === "CHECKIN_CLOSED") setErr(t("schedule.checkinClosed"));
      else setErr(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const tkn = params.get("t");
    if (user && tkn && !ok) void submit(tkn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="wrap section">
      <p className="kicker">{t("schedule.checkinKicker")}</p>
      <h1>{t("nav.checkin")}</h1>
      <p className="lead">{t("schedule.checkinUserLead")}</p>
      <div className="grid two">
        <article className="card">
          <div id={boxId} className="qr-reader" />
          <div className="row" style={{ marginTop: "0.8rem" }}>
            {!scanning ? (
              <button type="button" onClick={() => void startScan()}>
                {t("join.startCamera")}
              </button>
            ) : (
              <button type="button" className="ghost" onClick={() => void stopScan()}>
                {t("join.stopCamera")}
              </button>
            )}
          </div>
        </article>
        <article className="card">
          <label>
            {t("join.manualLabel")}
            <textarea value={manual} onChange={(e) => setManual(e.target.value)} rows={3} />
          </label>
          <button type="button" disabled={busy} onClick={() => void submit(manual)}>
            {t("schedule.checkinSubmit")}
          </button>
        </article>
      </div>
      {ok && <p className="ok">{ok}</p>}
      {err && <p className="error">{err}</p>}
    </div>
  );
}

export function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.notifications>>["notifications"]>([]);

  async function load() {
    const r = await api.notifications();
    setRows(r.notifications);
  }

  useEffect(() => {
    void load().catch(() => setRows([]));
  }, []);

  function label(n: (typeof rows)[0]) {
    if (n.type === "SESSION_SCHEDULED") {
      const title = String(n.payload.title ?? "");
      const when = n.payload.startsAt ? formatDt(String(n.payload.startsAt), locale) : "";
      return t("schedule.notifSession", { title, when });
    }
    if (n.type === "WEEKLY_SCHEDULE_UPDATED") {
      const title = String(n.payload.title ?? "");
      const weekday = Number(n.payload.weekday ?? 0);
      const startHm = String(n.payload.startHm ?? "");
      const endHm = String(n.payload.endHm ?? "");
      return t("schedule.notifWeekly", {
        title,
        day: weekday >= 1 && weekday <= 7 ? weekdayLabel(t, weekday) : "—",
        time: `${startHm}–${endHm}`,
      });
    }
    return n.type;
  }

  return (
    <div className="wrap section">
      <p className="kicker">{t("nav.notifications")}</p>
      <h1>{t("nav.notifications")}</h1>
      <div className="row" style={{ marginBottom: "1rem" }}>
        <button
          type="button"
          className="ghost"
          onClick={() => void api.notificationsReadAll().then(load)}
        >
          {t("schedule.markAllRead")}
        </button>
      </div>
      <div className="card">
        {rows.length === 0 && <p className="muted">{t("schedule.noNotifs")}</p>}
        <ul className="list">
          {rows.map((n) => (
            <li key={n.id} style={{ opacity: n.readAt ? 0.65 : 1 }}>
              <div>{label(n)}</div>
              <div className="muted">{formatDt(n.createdAt, locale)}</div>
              {!n.readAt && (
                <button type="button" className="ghost" onClick={() => void api.notificationRead(n.id).then(load)}>
                  {t("schedule.markRead")}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
