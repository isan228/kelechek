import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

function displayName(person: { firstName: string | null; lastName: string | null; phone?: string }) {
  const n = [person.firstName, person.lastName].filter(Boolean).join(" ");
  return n || person.phone || "—";
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
  const { t } = useTranslation();
  const [phone, setPhone] = useState("+996");
  const [trainees, setTrainees] = useState<Awaited<ReturnType<typeof api.coachTrainees>>["trainees"]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void api.coachTrainees().then((r) => setTrainees(r.trainees));
  }, []);

  async function send() {
    const res = await api.sendInvite(phone);
    setMsg(res.traineeHasCoach ? t("invites.alreadyHasCoach") : t("invites.sent"));
  }

  return (
    <section className="card">
      <h1>{t("invites.coachTitle")}</h1>
      <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div className="row" style={{ marginTop: "0.8rem" }}>
        <button type="button" onClick={() => void send()}>
          {t("invites.send")}
        </button>
      </div>
      {msg && <p className="ok">{msg}</p>}
      <ul className="list">
        {trainees.map((tr) => (
          <li key={tr.id}>
            {displayName(tr)} · {tr.phone}
          </li>
        ))}
      </ul>
    </section>
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
      <p className="muted">{t("profile.language")}: {t(`lang.${user?.locale ?? "ru"}`)}</p>
      <div className="row" style={{ marginTop: "0.8rem" }}>
        <button type="button" onClick={() => void save()}>
          {t("profile.save")}
        </button>
      </div>
      {saved && <p className="ok">{t("profile.saved")}</p>}
    </section>
  );
}
