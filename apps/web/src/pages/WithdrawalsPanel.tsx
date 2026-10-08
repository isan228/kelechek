import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api, type WithdrawalRequisites } from "../api/client";

type Data = Awaited<ReturnType<typeof api.adminWithdrawals>>;
type Item = Data["items"][number];

const OPEN = ["SUBMITTED", "IN_REVIEW", "NEED_INFO", "APPROVED", "PAYOUT_IN_PROGRESS"];

function displayPerson(p: { firstName: string | null; lastName: string | null; login?: string | null; phone: string }) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.login || p.phone;
}

function som(n: number) {
  return new Intl.NumberFormat("ru-KG", { maximumFractionDigits: 0 }).format(n);
}

function PendingCard({ item, onDone }: { item: Item; onDone: () => Promise<void> }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"idle" | "paid" | "reject">("idle");
  const [reference, setReference] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const r = item.requisites;

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      await onDone();
    } catch {
      setErr(t("withdrawals.actionError"));
      setBusy(false);
    }
  }

  return (
    <article className="card wd-card">
      <div className="wd-card-head">
        <div>
          <strong className="wd-amount">{som(item.amountKgs)} сом</strong>
          <div className="muted">
            {displayPerson(item.user)} · {item.user.phone}
          </div>
          <div className="muted">{new Date(item.createdAt).toLocaleString("ru-KG")}</div>
        </div>
        <span className="wd-badge wd-badge-warn">{t(`withdrawals.status.${item.status}`)}</span>
      </div>

      <dl className="wd-req">
        <dt>{t("withdrawals.method")}</dt>
        <dd>{t(`withdrawals.methods.${r.kind}`)}</dd>
        <RequisitesRows r={r} />
        <dt>{t("withdrawals.recipient")}</dt>
        <dd>{r.recipientName}</dd>
      </dl>

      {mode === "idle" && (
        <div className="wd-actions">
          <button type="button" disabled={busy} onClick={() => setMode("paid")}>
            {t("withdrawals.markPaid")}
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={() => setMode("reject")}>
            {t("withdrawals.reject")}
          </button>
        </div>
      )}

      {mode === "paid" && (
        <form
          className="wd-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => api.adminMarkWithdrawalPaid(item.id, { payoutReference: reference, comment }));
          }}
        >
          <label>
            {t("withdrawals.reference")}
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="№ платежа / чека" />
          </label>
          <label>
            {t("withdrawals.comment")}
            <input value={comment} onChange={(e) => setComment(e.target.value)} />
          </label>
          <div className="wd-actions">
            <button type="submit" disabled={busy}>
              {t("withdrawals.confirmPaid", { amount: som(item.amountKgs) })}
            </button>
            <button type="button" className="ghost" disabled={busy} onClick={() => setMode("idle")}>
              {t("withdrawals.back")}
            </button>
          </div>
        </form>
      )}

      {mode === "reject" && (
        <form
          className="wd-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (comment.trim()) void run(() => api.adminRejectWithdrawal(item.id, comment));
          }}
        >
          <label>
            {t("withdrawals.rejectReason")}
            <input value={comment} onChange={(e) => setComment(e.target.value)} required />
          </label>
          <div className="wd-actions">
            <button type="submit" disabled={busy || !comment.trim()}>
              {t("withdrawals.confirmReject")}
            </button>
            <button type="button" className="ghost" disabled={busy} onClick={() => setMode("idle")}>
              {t("withdrawals.back")}
            </button>
          </div>
        </form>
      )}
      {err && <p className="wd-err">{err}</p>}
    </article>
  );
}

function RequisitesRows({ r }: { r: WithdrawalRequisites }) {
  const { t } = useTranslation();
  if (r.kind === "PHONE") {
    return (
      <>
        <dt>{t("withdrawals.phone")}</dt>
        <dd className="wd-mono">{r.phone}</dd>
        {r.provider && (
          <>
            <dt>{t("withdrawals.provider")}</dt>
            <dd>{r.provider}</dd>
          </>
        )}
      </>
    );
  }
  return (
    <>
      <dt>{t("withdrawals.bank")}</dt>
      <dd>{r.bankName}</dd>
      <dt>{t("withdrawals.account")}</dt>
      <dd className="wd-mono">{r.accountNumber}</dd>
    </>
  );
}

export function WithdrawalsPanel() {
  const { t } = useTranslation();
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [sub, setSub] = useState<"pending" | "flow" | "history" | "months">("pending");

  async function load() {
    try {
      setData(await api.adminWithdrawals());
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (failed) return <p className="muted">{t("withdrawals.loadError")}</p>;
  if (!data) return <p className="muted">{t("admin.loading")}</p>;

  const pending = data.items.filter((w) => OPEN.includes(w.status));
  const closed = data.items.filter((w) => !OPEN.includes(w.status));
  const net = data.summary.incomingKgs - data.summary.outgoingKgs;

  const subs: { id: typeof sub; label: string }[] = [
    { id: "pending", label: `${t("withdrawals.subPending")}${pending.length ? ` · ${pending.length}` : ""}` },
    { id: "flow", label: t("withdrawals.subFlow") },
    { id: "history", label: t("withdrawals.subHistory") },
    { id: "months", label: t("withdrawals.subMonths") },
  ];

  return (
    <div className="admin-accounting">
      <div className="stats">
        <div className="stat">
          <b className="wd-in">+{som(data.summary.incomingKgs)}</b>
          <span>{t("withdrawals.incoming", { count: data.summary.incomingCount })}</span>
        </div>
        <div className="stat">
          <b className="wd-out">−{som(data.summary.outgoingKgs)}</b>
          <span>{t("withdrawals.outgoing", { count: data.summary.outgoingCount })}</span>
        </div>
        <div className="stat">
          <b>{som(data.summary.pendingKgs)}</b>
          <span>{t("withdrawals.pending", { count: data.summary.pendingCount })}</span>
        </div>
        <div className="stat">
          <b>{som(net)}</b>
          <span>{t("withdrawals.net")}</span>
        </div>
      </div>

      <div className="admin-tabs" style={{ marginTop: "1rem" }}>
        {subs.map((s) => (
          <button key={s.id} type="button" className={sub === s.id ? "" : "ghost"} onClick={() => setSub(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {sub === "pending" &&
        (pending.length === 0 ? (
          <p className="muted">{t("withdrawals.emptyPending")}</p>
        ) : (
          <div className="wd-grid">
            {pending.map((w) => (
              <PendingCard key={w.id} item={w} onDone={load} />
            ))}
          </div>
        ))}

      {sub === "flow" && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("withdrawals.colDate")}</th>
                <th>{t("withdrawals.colType")}</th>
                <th>{t("withdrawals.colWho")}</th>
                <th>{t("withdrawals.colAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {data.flow.map((f) => (
                <tr key={f.id}>
                  <td>{new Date(f.at).toLocaleString("ru-KG")}</td>
                  <td>{f.direction === "in" ? t("withdrawals.flowIn") : t("withdrawals.flowOut")}</td>
                  <td>
                    {f.person} · {f.phone}
                  </td>
                  <td className={f.direction === "in" ? "wd-in" : "wd-out"}>
                    {f.direction === "in" ? "+" : "−"}
                    {som(f.amountKgs)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.flow.length === 0 && <p className="muted">{t("withdrawals.emptyFlow")}</p>}
        </div>
      )}

      {sub === "history" && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("withdrawals.colRequested")}</th>
                <th>{t("withdrawals.colWho")}</th>
                <th>{t("withdrawals.colAmount")}</th>
                <th>{t("withdrawals.method")}</th>
                <th>{t("withdrawals.colStatus")}</th>
                <th>{t("withdrawals.colProcessed")}</th>
                <th>{t("withdrawals.comment")}</th>
              </tr>
            </thead>
            <tbody>
              {closed.map((w) => (
                <tr key={w.id}>
                  <td>{new Date(w.createdAt).toLocaleDateString("ru-KG")}</td>
                  <td>
                    {displayPerson(w.user)} · {w.user.phone}
                  </td>
                  <td>{som(w.amountKgs)}</td>
                  <td>
                    {t(`withdrawals.methods.${w.requisites.kind}`)}:{" "}
                    {w.requisites.kind === "PHONE" ? w.requisites.phone : w.requisites.accountNumber}
                  </td>
                  <td>
                    <span className={`wd-badge ${w.status === "PAID" ? "wd-badge-ok" : ""}`}>
                      {t(`withdrawals.status.${w.status}`)}
                    </span>
                  </td>
                  <td>
                    {w.processedAt ? new Date(w.processedAt).toLocaleString("ru-KG") : "—"}
                    {w.processedBy ? ` · ${w.processedBy}` : ""}
                  </td>
                  <td>{[w.payoutReference, w.adminComment].filter(Boolean).join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {closed.length === 0 && <p className="muted">{t("withdrawals.emptyHistory")}</p>}
        </div>
      )}

      {sub === "months" && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.accMonth")}</th>
                <th>{t("withdrawals.colIn")}</th>
                <th>{t("withdrawals.colOut")}</th>
                <th>{t("withdrawals.net")}</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((m) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td className="wd-in">+{som(m.inKgs)}</td>
                  <td className="wd-out">−{som(m.outKgs)}</td>
                  <td>{som(m.inKgs - m.outKgs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.monthly.length === 0 && <p className="muted">{t("withdrawals.emptyFlow")}</p>}
        </div>
      )}
    </div>
  );
}
