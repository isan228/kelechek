import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";

function formatSom(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "ky" ? "ky-KG" : "ru-KG", { maximumFractionDigits: 0 }).format(value);
}

export function MembershipsPage() {
  const { t, i18n } = useTranslation();
  const { s, photo } = useSiteCopy();
  const { user } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const [tariffs, setTariffs] = useState<Awaited<ReturnType<typeof api.tariffs>>["tariffs"]>([]);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.tariffs(locale).then((r) => setTariffs(r.tariffs));
  }, [locale]);

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
    <>
      <div className="page-hero">
        <div className="wrap">
          <p className="kicker">{t("nav.memberships")}</p>
          <h1>{s("pay.title")}</h1>
          <p className="lead">{s("pay.pageLead")}</p>
        </div>
      </div>
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <img className="page-banner" src={photo("future")} alt="" />
        </div>
        <div className="wrap grid two">
          {tariffs.map((tariff) => (
            <article className="card" key={tariff.id}>
              <span className="badge">{t("pay.period", { days: tariff.periodDays })}</span>
              <h2>{tariff.name}</h2>
              <div className="price">{formatSom(tariff.priceKgs, locale)} сом</div>
              <p className="muted">{tariff.description}</p>
              {user ? (
                <button type="button" disabled={busy} onClick={() => void pay(tariff.id)}>
                  {busy ? t("pay.working") : t("pay.submit", { price: formatSom(tariff.priceKgs, locale) })}
                </button>
              ) : (
                <Link to="/login">
                  <button type="button">{t("nav.login")}</button>
                </Link>
              )}
            </article>
          ))}
        </div>
        {ok && (
          <div className="wrap">
            <p className="ok">{t("pay.success")}</p>
          </div>
        )}
      </section>
    </>
  );
}
