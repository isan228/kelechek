import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";

function formatSom(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "ky" ? "ky-KG" : "ru-KG", { maximumFractionDigits: 0 }).format(value);
}

export function PayPage() {
  const { t, i18n } = useTranslation();
  const [tariffs, setTariffs] = useState<Awaited<ReturnType<typeof api.tariffs>>["tariffs"]>([]);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";

  useEffect(() => {
    void api.tariffs().then((r) => setTariffs(r.tariffs));
  }, []);

  async function pay(id: string) {
    setBusy(true);
    try {
      await api.pay(id);
      setOk(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>{t("pay.title")}</h1>
      {tariffs.map((tariff) => (
        <article key={tariff.id}>
          <h2>{tariff.name}</h2>
          <p>{tariff.description}</p>
          <p className="muted">{t("pay.period", { days: tariff.periodDays })}</p>
          <button type="button" disabled={busy} onClick={() => void pay(tariff.id)}>
            {busy ? t("pay.working") : t("pay.submit", { price: formatSom(tariff.priceKgs, locale) })}
          </button>
        </article>
      ))}
      {ok && <p className="ok">{t("pay.success")}</p>}
    </div>
  );
}

export function BalancePage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.balance>> | null>(null);
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof api.ledger>>["entries"]>([]);
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";

  useEffect(() => {
    void api.balance().then(setData);
    void api.ledger().then((r) => setEntries(r.entries));
  }, []);

  return (
    <div className="wrap section">
    <div className="grid two">
      <section className="card">
        <h1>{t("balance.title")}</h1>
        <div className="muted">{t("balance.available")}</div>
        <div className="hero-sum serif">{formatSom(data?.balance.available ?? 0, locale)}</div>
        <h2>{t("balance.progressTitle")}</h2>
        <p>
          {t("balance.holding", {
            held: data?.withdrawalProgress.monthsHeld ?? 0,
            need: data?.withdrawalProgress.holdingMonths ?? 12,
          })}{" "}
          — {data?.withdrawalProgress.holdingPassed ? t("balance.passed") : t("balance.pending")}
        </p>
        <p>
          {t("balance.minAmount", { min: data?.withdrawalProgress.minAmountKgs ?? 1000 })} —{" "}
          {data?.withdrawalProgress.minAmountPassed ? t("balance.passed") : t("balance.pending")}
        </p>
      </section>
      <section className="card">
        <h2>{t("balance.history")}</h2>
        {entries.length === 0 && <p className="muted">{t("balance.empty")}</p>}
        <ul className="list">
          {entries.map((e) => (
            <li key={e.id}>
              {t("balance.accrual")}: {e.signedAmount > 0 ? "+" : ""}
              {e.signedAmount} · {new Intl.DateTimeFormat(locale === "ky" ? "ky-KG" : "ru-KG", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Asia/Bishkek",
              }).format(new Date(e.createdAt))}
            </li>
          ))}
        </ul>
      </section>
    </div>
    </div>
  );
}
