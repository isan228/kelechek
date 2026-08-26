import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

function displayPerson(p: {
  firstName: string | null;
  lastName: string | null;
  phone?: string;
  login?: string | null;
}) {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || p.login || p.phone || "—";
}

export function AccountingPanel() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [data, setData] = useState<Awaited<ReturnType<typeof api.adminAccounting>> | null>(null);
  const [sub, setSub] = useState<"summary" | "journal" | "coaches" | "trainees" | "months">("summary");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    void api.adminAccounting().then(setData).catch(() => setData(null));
  }, []);

  if (!data) return <p className="muted">{t("admin.loading")}</p>;

  const subs: { id: typeof sub; label: string }[] = [
    { id: "summary", label: t("admin.accSubSummary") },
    { id: "journal", label: t("admin.accSubJournal") },
    { id: "months", label: t("admin.accSubMonths") },
    { id: "coaches", label: t("admin.accSubCoaches") },
    { id: "trainees", label: t("admin.accSubTrainees") },
  ];

  return (
    <div className="admin-accounting">
      <p className="muted">{t("admin.accountingLead")}</p>
      <div className="admin-tabs" style={{ marginTop: "0.8rem" }}>
        {subs.map((s) => (
          <button
            key={s.id}
            type="button"
            className={sub === s.id ? "" : "ghost"}
            onClick={() => setSub(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sub === "summary" && (
        <div className="admin-stats">
          <section>
            <h2>{t("admin.accTotals")}</h2>
            <div className="stats">
              <div className="stat">
                <b>{data.totals.succeededPayments}</b>
                <span>{t("admin.statSucceeded")}</span>
              </div>
              <div className="stat">
                <b>{data.totals.paidKgs}</b>
                <span>{t("admin.paidKgs")}</span>
              </div>
              <div className="stat">
                <b>{data.totals.traineeShareKgs}</b>
                <span>{t("admin.traineeShareKgs")}</span>
              </div>
              <div className="stat">
                <b>{data.totals.coachShareKgs}</b>
                <span>{t("admin.coachShareKgs")}</span>
              </div>
              <div className="stat">
                <b>{data.totals.operatorShareKgs}</b>
                <span>{t("admin.operatorShareKgs")}</span>
              </div>
            </div>
          </section>

          <section>
            <h2>{t("admin.statsByMode")}</h2>
            <div className="admin-mode-grid">
              <article className="card admin-mode-card">
                <h3>{t("admin.ratesSolo")}</h3>
                <p className="muted">
                  {t("admin.ratesLine", {
                    trainee: data.rates.solo.traineePct,
                    coach: data.rates.solo.coachPct,
                    operator: data.rates.solo.operatorPct,
                  })}
                </p>
                <div className="stats">
                  <div className="stat">
                    <b>{data.byMode.solo.count}</b>
                    <span>{t("admin.modePayments")}</span>
                  </div>
                  <div className="stat">
                    <b>{data.byMode.solo.paidKgs}</b>
                    <span>{t("admin.modePaid")}</span>
                  </div>
                  <div className="stat">
                    <b>{data.byMode.solo.traineeShareKgs}</b>
                    <span>{t("admin.colTraineeShare")}</span>
                  </div>
                  <div className="stat">
                    <b>{data.byMode.solo.coachShareKgs}</b>
                    <span>{t("admin.colCoachShare")}</span>
                  </div>
                  <div className="stat">
                    <b>{data.byMode.solo.operatorShareKgs}</b>
                    <span>{t("admin.colOperatorShare")}</span>
                  </div>
                </div>
              </article>
              <article className="card admin-mode-card">
                <h3>{t("admin.ratesWithCoach")}</h3>
                <p className="muted">
                  {t("admin.ratesLine", {
                    trainee: data.rates.withCoach.traineePct,
                    coach: data.rates.withCoach.coachPct,
                    operator: data.rates.withCoach.operatorPct,
                  })}
                </p>
                <div className="stats">
                  <div className="stat">
                    <b>{data.byMode.withCoach.count}</b>
                    <span>{t("admin.modePayments")}</span>
                  </div>
                  <div className="stat">
                    <b>{data.byMode.withCoach.paidKgs}</b>
                    <span>{t("admin.modePaid")}</span>
                  </div>
                  <div className="stat">
                    <b>{data.byMode.withCoach.traineeShareKgs}</b>
                    <span>{t("admin.colTraineeShare")}</span>
                  </div>
                  <div className="stat">
                    <b>{data.byMode.withCoach.coachShareKgs}</b>
                    <span>{t("admin.colCoachShare")}</span>
                  </div>
                  <div className="stat">
                    <b>{data.byMode.withCoach.operatorShareKgs}</b>
                    <span>{t("admin.colOperatorShare")}</span>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      )}

      {sub === "journal" && (
        <div>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            {t("admin.journalLead")}
          </p>
          {data.journal.length === 0 && <p className="muted">{t("admin.emptyPayments")}</p>}
          <div className="admin-journal">
            {data.journal.map((entry) => {
              const open = openId === entry.id;
              return (
                <article key={entry.id} className="card admin-journal-card">
                  <button
                    type="button"
                    className="admin-journal-head"
                    onClick={() => setOpenId(open ? null : entry.id)}
                  >
                    <div>
                      <strong>
                        {entry.amountKgs} сом · {entry.tariffName || t("admin.tab.tariffs")}
                      </strong>
                      <div className="muted">
                        {new Date(entry.at).toLocaleString(locale === "ky" ? "ky-KG" : "ru-KG")} ·{" "}
                        {entry.reasonText}
                      </div>
                      <div className="muted">
                        {t("admin.accWho")}: {displayPerson(entry.payer)} ({entry.payer.phone})
                        {entry.coach
                          ? ` · ${t("admin.accCoach")}: ${displayPerson(entry.coach)}`
                          : ""}
                      </div>
                    </div>
                    <span className="admin-journal-toggle">{open ? "−" : "+"}</span>
                  </button>
                  {open && (
                    <div className="admin-journal-body">
                      <div className="table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>{t("admin.accAccount")}</th>
                              <th>{t("admin.accWhom")}</th>
                              <th>{t("admin.accAmount")}</th>
                              <th>{t("admin.accWhy")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {entry.lines.map((line, idx) => (
                              <tr key={`${entry.id}-${idx}`}>
                                <td>
                                  {line.account === "TRAINEE"
                                    ? t("admin.accAccountTrainee")
                                    : line.account === "COACH"
                                      ? t("admin.accAccountCoach")
                                      : t("admin.accAccountOperator")}
                                </td>
                                <td>
                                  {line.party
                                    ? `${displayPerson(line.party)}${line.party.phone ? ` · ${line.party.phone}` : ""}`
                                    : t("admin.accOperatorSelf")}
                                </td>
                                <td>+{line.amountKgs}</td>
                                <td>{line.why}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {sub === "months" && (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.accMonth")}</th>
                <th>{t("admin.modePayments")}</th>
                <th>{t("admin.statSolo")}</th>
                <th>{t("admin.statWithCoach")}</th>
                <th>{t("admin.modePaid")}</th>
                <th>{t("admin.colTraineeShare")}</th>
                <th>{t("admin.colCoachShare")}</th>
                <th>{t("admin.colOperatorShare")}</th>
              </tr>
            </thead>
            <tbody>
              {data.monthly.map((m) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td>{m.count}</td>
                  <td>{m.soloCount}</td>
                  <td>{m.withCoachCount}</td>
                  <td>{m.paidKgs}</td>
                  <td>{m.traineeShareKgs}</td>
                  <td>{m.coachShareKgs}</td>
                  <td>{m.operatorShareKgs}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.monthly.length === 0 && <p className="muted">{t("admin.emptyPayments")}</p>}
        </div>
      )}

      {sub === "coaches" && (
        <div className="table-wrap">
          <p className="muted" style={{ marginBottom: "0.8rem" }}>
            {t("admin.coachAccountsLead")}
          </p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.accCoach")}</th>
                <th>{t("auth.phone")}</th>
                <th>{t("admin.coachEarned")}</th>
                <th>{t("admin.accEntries")}</th>
              </tr>
            </thead>
            <tbody>
              {data.coachAccounts.map((row) => (
                <tr key={row.coach.id}>
                  <td>{displayPerson(row.coach)}</td>
                  <td>{row.coach.phone}</td>
                  <td>{row.earnedKgs}</td>
                  <td>{row.entries}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.coachAccounts.length === 0 && <p className="muted">{t("admin.emptyAccounts")}</p>}
        </div>
      )}

      {sub === "trainees" && (
        <div className="table-wrap">
          <p className="muted" style={{ marginBottom: "0.8rem" }}>
            {t("admin.traineeAccountsLead")}
          </p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("admin.payer")}</th>
                <th>{t("auth.phone")}</th>
                <th>{t("admin.traineeBalance")}</th>
                <th>{t("admin.accEntries")}</th>
              </tr>
            </thead>
            <tbody>
              {data.traineeAccounts.map((row) => (
                <tr key={row.trainee.id}>
                  <td>{displayPerson(row.trainee)}</td>
                  <td>{row.trainee.phone}</td>
                  <td>{row.balanceKgs}</td>
                  <td>{row.entries}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.traineeAccounts.length === 0 && <p className="muted">{t("admin.emptyAccounts")}</p>}
        </div>
      )}
    </div>
  );
}

/** Кабинет бухгалтера — только бухгалтерия. */
export function AccountingPage() {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.roles.includes("ACCOUNTANT") && !user.roles.includes("ADMIN")) {
    return <Navigate to="/cabinet" replace />;
  }

  return (
    <div className="wrap section">
      <p className="kicker">{t("admin.tab.accounting")}</p>
      <h1>{t("admin.accountantCabinetTitle")}</h1>
      <p className="muted">{t("admin.accountantCabinetLead")}</p>
      <AccountingPanel />
    </div>
  );
}
