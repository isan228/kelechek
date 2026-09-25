import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";
import { PageHero } from "../components/PageHero";

function formatSom(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "ky" ? "ky-KG" : "ru-KG", { maximumFractionDigits: 0 }).format(value);
}

export function MembershipsPage() {
  const { t, i18n } = useTranslation();
  const { s } = useSiteCopy();
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
      <PageHero kicker={t("nav.memberships")} title={s("pay.title")} lead={s("pay.pageLead")} />
      <section className="band">
        <div className="wrap">
          <Reveal>
            <div className="section-head">
              <p className="kicker">{t("pay.howKicker")}</p>
              <h2>{t("pay.howTitle")}</h2>
              <p className="muted">{t("pay.howLead")}</p>
            </div>
          </Reveal>
          <div className="story-grid" style={{ marginBottom: "2.8rem" }}>
            {[1, 2, 3].map((n) => (
              <Reveal key={n} delay={n * 60} variant="up">
                <article className="story-block">
                  <em className="kicker">0{n}</em>
                  <h3>{t(`pay.how${n}t`)}</h3>
                  <p className="muted">{t(`pay.how${n}`)}</p>
                </article>
              </Reveal>
            ))}
          </div>
          <div className="grid two">
            {tariffs.map((tariff, i) => (
              <Reveal key={tariff.id} delay={i * 70} variant="scale">
                <article className="card tariff-card">
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
          {ok && <p className="ok" style={{ marginTop: "1.2rem" }}>{t("pay.success")}</p>}
        </div>
      </section>
    </>
  );
}
