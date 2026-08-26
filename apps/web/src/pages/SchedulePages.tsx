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
    <div className="grid two" style={{ marginTop: "1.4rem" }}>
      <article className="card">
        <h2>{t("schedule.createTitle")}</h2>
        <p className="muted">{t("schedule.createLead")}</p>
        <form onSubmit={(e) => void create(e)}>
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
          <div className="row" style={{ marginTop: "0.8rem" }}>
            <button type="submit" disabled={busy}>
              {t("schedule.save")}
            </button>
          </div>
        </form>
      </article>

      <article className="card">
        <h2>{t("schedule.listTitle")}</h2>
        {sessions.length === 0 && <p className="muted">{t("schedule.empty")}</p>}
        <ul className="list">
          {sessions.map((s) => (
            <li key={s.id}>
              <strong>{s.title}</strong>
              <div className="muted">
                {formatDt(s.startsAt, locale)} — {formatDt(s.endsAt, locale)}
              </div>
              <div className="muted">{t("schedule.presentCount", { count: s.presentCount })}</div>
              <div className="row" style={{ marginTop: "0.5rem", flexWrap: "wrap", gap: "0.4rem" }}>
                <button type="button" disabled={busy} onClick={() => void openCheckIn(s.id)}>
                  {t("schedule.checkinQr")}
                </button>
                <button type="button" className="ghost" disabled={busy} onClick={() => void remove(s.id)}>
                  {t("admin.cancel")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </article>

      {checkInId && qrUrl && (
        <article className="card" style={{ gridColumn: "1 / -1" }}>
          <h2>{t("schedule.checkinTitle")}</h2>
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

export function TraineeSchedulePage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [data, setData] = useState<Awaited<ReturnType<typeof api.mySchedule>> | null>(null);

  useEffect(() => {
    if (user) void api.mySchedule().then(setData).catch(() => setData({ coach: null, sessions: [] }));
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
      <div className="card">
        {data?.sessions.length === 0 && <p className="muted">{t("schedule.emptyTrainee")}</p>}
        <ul className="list">
          {data?.sessions.map((s) => (
            <li key={s.id}>
              <strong>{s.title}</strong>
              <div className="muted">
                {formatDt(s.startsAt, locale)} — {formatDt(s.endsAt, locale)}
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
