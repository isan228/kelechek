import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { CoachSchedulePanel } from "./SchedulePages";

function displayName(person: {
  firstName: string | null;
  lastName: string | null;
  phone?: string;
  login?: string | null;
}) {
  const n = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return n || person.login || person.phone || "—";
}

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "ky" ? "ky-KG" : "ru-KG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function InvitesPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.invitations>> | null>(null);

  async function load() {
    setData(await api.invitations());
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="card">
      <h1>{t("invites.title")}</h1>
      {data?.relation && (
        <p>
          {t("invites.current", { name: displayName(data.relation.coach) })}{" "}
          <button
            className="secondary"
            type="button"
            onClick={() => void api.endRelation().then(load)}
          >
            {t("invites.end")}
          </button>
        </p>
      )}
      {data?.invites.length === 0 && <p className="muted">{t("invites.none")}</p>}
      <ul className="list">
        {data?.invites.map((inv) => (
          <li key={inv.id}>
            <div>{t("invites.from", { name: displayName(inv.coach) })}</div>
            {data.relation && <p className="muted">{t("invites.hasCoachHint")}</p>}
            <div className="row">
              <button
                type="button"
                onClick={() => void api.respondInvite(inv.id, true, Boolean(data.relation)).then(load)}
              >
                {t("invites.accept")}
              </button>
              <button className="secondary" type="button" onClick={() => void api.respondInvite(inv.id, false).then(load)}>
                {t("invites.decline")}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CoachPage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [phone, setPhone] = useState("+996");
  const [data, setData] = useState<Awaited<ReturnType<typeof api.coachDashboard>> | null>(null);
  const [qr, setQr] = useState<{ joinUrl: string; day: string; validUntil: string; dataUrl: string } | null>(
    null,
  );
  const [sportRu, setSportRu] = useState("");
  const [sportKy, setSportKy] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadQr() {
    const res = await api.coachQr();
    const dataUrl = await QRCode.toDataURL(res.joinUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    setQr({ joinUrl: res.joinUrl, day: res.day, validUntil: res.validUntil, dataUrl });
  }

  async function load() {
    const res = await api.coachDashboard();
    setData(res);
    setSportRu(res.coach.sportRu ?? "");
    setSportKy(res.coach.sportKy ?? "");
  }

  useEffect(() => {
    if (user?.roles.includes("COACH")) {
      void load().catch(() => setData(null));
      void loadQr().catch(() => setQr(null));
    }
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles.includes("COACH")) {
    return <Navigate to="/cabinet" replace />;
  }

  async function send() {
    setErr(null);
    setBusy(true);
    try {
      const res = await api.sendInvite(phone);
      setMsg(res.traineeHasCoach ? t("invites.alreadyHasCoach") : t("invites.sent"));
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function detach(traineeId: string) {
    setBusy(true);
    try {
      await api.endRelation(traineeId);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const coach = data?.coach;
  const name = coach ? displayName(coach) : displayName(user);

  return (
    <div className="wrap section">
      <p className="kicker">{t("coachCabinet.kicker")}</p>
      <h1>{t("coachCabinet.title")}</h1>
      <p className="lead">{t("coachCabinet.lead", { name })}</p>

      <div className="stats" style={{ marginTop: "1.2rem" }}>
        <div className="stat">
          <b>{data?.traineeCount ?? "—"}</b>
          <span>{t("coachCabinet.trainees")}</span>
        </div>
        <div className="stat">
          <b>{data?.earnedKgs ?? "—"}</b>
          <span>{t("coachCabinet.earned")}</span>
        </div>
        <div className="stat">
          <b>{data?.pendingInvites ?? "—"}</b>
          <span>{t("coachCabinet.pending")}</span>
        </div>
      </div>

      <article className="card coach-qr-card" style={{ marginTop: "1.4rem" }}>
        <h2>{t("coachCabinet.qrTitle")}</h2>
        <p className="muted">{t("coachCabinet.qrLead")}</p>
        {qr ? (
          <div className="coach-qr-wrap">
            <img src={qr.dataUrl} alt="QR" className="coach-qr-img" />
            <div>
              <p>
                <strong>{t("coachCabinet.qrDay")}:</strong> {qr.day}
              </p>
              <p className="muted">{t("coachCabinet.qrUntil", { time: formatDate(qr.validUntil, locale) })}</p>
              <button type="button" className="ghost" onClick={() => void loadQr()}>
                {t("coachCabinet.qrRefresh")}
              </button>
            </div>
          </div>
        ) : (
          <p className="muted">{t("admin.loading")}</p>
        )}
      </article>

      <div className="grid two" style={{ marginTop: "1.4rem" }}>
        <article className="card">
          <h2>{t("coachCabinet.about")}</h2>
          <dl className="coach-meta">
            <div>
              <dt>{t("auth.login")}</dt>
              <dd>{coach?.login ?? user.login ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("profile.firstName")}</dt>
              <dd>{coach?.firstName ?? user.firstName ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("profile.lastName")}</dt>
              <dd>{coach?.lastName ?? user.lastName ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("auth.phone")}</dt>
              <dd>{coach?.phone ?? user.phone ?? "—"}</dd>
            </div>
            <div>
              <dt>{t("coachCabinet.since")}</dt>
              <dd>{formatDate(coach?.createdAt ?? null, locale)}</dd>
            </div>
            <div>
              <dt>{t("coachCabinet.sport")}</dt>
              <dd>{(locale === "ky" ? coach?.sportKy || coach?.sportRu : coach?.sportRu || coach?.sportKy) || "—"}</dd>
            </div>
          </dl>
          <label>
            {t("coachCabinet.sportRu")}
            <input value={sportRu} onChange={(e) => setSportRu(e.target.value)} placeholder="бокс, борьба…" />
          </label>
          <label>
            {t("coachCabinet.sportKy")}
            <input value={sportKy} onChange={(e) => setSportKy(e.target.value)} />
          </label>
          <div className="row" style={{ marginTop: "0.8rem" }}>
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() => {
                void api
                  .coachPatchProfile({ sportRu, sportKy })
                  .then(() => load())
                  .then(() => setMsg(t("profile.saved")));
              }}
            >
              {t("coachCabinet.saveSport")}
            </button>
            <Link to="/profile">
              <button type="button" className="ghost">
                {t("nav.profile")}
              </button>
            </Link>
          </div>
          {(coach?.bioRu || coach?.bioKy) && (
            <p className="muted" style={{ marginTop: "0.8rem" }}>
              {locale === "ky" ? coach.bioKy || coach.bioRu : coach.bioRu || coach.bioKy}
            </p>
          )}
        </article>

        <article className="card">
          <h2>{t("invites.coachTitle")}</h2>
          <p className="muted">{t("coachCabinet.inviteLead")}</p>
          <label>
            {t("auth.phone")}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <div className="row" style={{ marginTop: "0.8rem" }}>
            <button type="button" disabled={busy} onClick={() => void send()}>
              {t("invites.send")}
            </button>
          </div>
          {msg && <p className="ok">{msg}</p>}
          {err && <p className="error">{err}</p>}
        </article>
      </div>

      <h2 style={{ marginTop: "1.6rem" }}>{t("schedule.sectionTitle")}</h2>
      <CoachSchedulePanel />

      <section className="card" style={{ marginTop: "1.4rem" }}>
        <h2>{t("coachCabinet.listTitle")}</h2>
        {!data && <p className="muted">{t("admin.loading")}</p>}
        {data && data.trainees.length === 0 && (
          <p className="muted">{t("coachCabinet.empty")}</p>
        )}
        {data && data.trainees.length > 0 && (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("coachCabinet.colName")}</th>
                  <th>{t("auth.login")}</th>
                  <th>{t("auth.phone")}</th>
                  <th>{t("coachCabinet.colSince")}</th>
                  <th>{t("coachCabinet.colMembership")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.trainees.map((tr) => (
                  <tr key={tr.id}>
                    <td>{displayName(tr)}</td>
                    <td>{tr.login ?? "—"}</td>
                    <td>{tr.phone}</td>
                    <td>{formatDate(tr.relationStartedAt, locale)}</td>
                    <td>
                      {tr.membershipEndsAt
                        ? t("coachCabinet.membershipUntil", {
                            date: formatDate(tr.membershipEndsAt, locale),
                          })
                        : t("coachCabinet.noMembership")}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="ghost"
                        disabled={busy}
                        onClick={() => void detach(tr.id)}
                      >
                        {t("invites.end")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saved, setSaved] = useState(false);

  async function save() {
    const res = await api.patchMe({ firstName, lastName });
    setUser(res.user);
    setSaved(true);
  }

  return (
    <div className="wrap section">
      <section className="card" style={{ maxWidth: 480 }}>
        <h1>{t("profile.title")}</h1>
        <label>
          {t("profile.firstName")}
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </label>
        <label>
          {t("profile.lastName")}
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </label>
        <p className="muted">
          {t("profile.language")}: {t(`lang.${user?.locale ?? "ru"}`)}
        </p>
        {user?.login && (
          <p className="muted">
            {t("auth.login")}: {user.login}
          </p>
        )}
        <div className="row" style={{ marginTop: "0.8rem" }}>
          <button type="button" onClick={() => void save()}>
            {t("profile.save")}
          </button>
        </div>
        {saved && <p className="ok">{t("profile.saved")}</p>}
      </section>
    </div>
  );
}
