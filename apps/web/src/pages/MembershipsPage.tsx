import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";

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
      const res = await api.pay(id);
      if (res.paymentUrl) {
        window.location.href = res.paymentUrl;
        return;
      }
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
      <section className="band" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <img className="page-banner" src={photo("future")} alt="" />
        </div>
        <div className="wrap" style={{ marginTop: "2rem" }}>
          <Reveal>
            <div className="section-head">
              <p className="kicker">{t("pay.howKicker")}</p>
              <h2>{t("pay.howTitle")}</h2>
              <p className="muted">{t("pay.howLead")}</p>
            </div>
          </Reveal>
          <div className="story-grid" style={{ marginBottom: "2.5rem" }}>
            {[1, 2, 3].map((n) => (
              <Reveal key={n} delay={n * 60}>
                <article className="story-block">
                  <h3>{t(`pay.how${n}t`)}</h3>
                  <p className="muted">{t(`pay.how${n}`)}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
        <div className="wrap grid two">
          {tariffs.map((tariff, i) => (
            <Reveal key={tariff.id} delay={i * 80}>
              <article className="card">
                <span className="badge">{t("pay.period", { days: tariff.periodDays })}</span>
                <h2>{tariff.name}</h2>
                <div className="invest-amount">
                  {formatSom(tariff.priceKgs, locale)} {t("pay.currency")}
                </div>
                <p className="muted">{t("pay.investLabel")}</p>
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
            </Reveal>
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
