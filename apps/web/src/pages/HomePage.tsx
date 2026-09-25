import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { distributePayment } from "@kelech/shared";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";
import { useSiteCopy } from "../content/SiteCopyProvider";
import { Reveal } from "../components/Reveal";

function formatSom(n: number, locale: string) {
  return new Intl.NumberFormat(locale === "ky" ? "ky-KG" : "ru-KG", { maximumFractionDigits: 0 }).format(n);
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { s } = useSiteCopy();
  const { user } = useAuth();
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";
  const startTo = user ? "/app" : "/login";

  const [months, setMonths] = useState(6);
  const [withCoach, setWithCoach] = useState(false);
  const [monthly, setMonthly] = useState(2500);
  const [tariffName, setTariffName] = useState("");

  useEffect(() => {
    void api
      .tariffs(locale)
      .then((r) => {
        const first = r.tariffs[0];
        if (first) {
          setMonthly(first.priceKgs);
          setTariffName(first.name);
        }
      })
      .catch(() => undefined);
  }, [locale]);

  const calc = useMemo(() => {
    const per = distributePayment(monthly, withCoach);
    return {
      perMonth: per.trainee,
      total: per.trainee * months,
      operatorNote: per.operator,
    };
  }, [monthly, months, withCoach]);

  if (
    user?.roles.includes("ACCOUNTANT") &&
    !user.roles.includes("ADMIN") &&
    !user.roles.includes("COACH") &&
    !user.roles.includes("TRAINEE")
  ) {
    return <Navigate to="/accounting" replace />;
  }

  return (
    <div className="home-v">
      <section className="home-hero">
        <div className="wrap home-hero-inner">
          <p className="home-kicker">{s("landing.kicker")}</p>
          <h1 className="home-brand">{s("appName")}</h1>
          <p className="home-title">{s("landing.title")}</p>
          <p className="home-lead">{s("landing.lead")}</p>
          <div className="cta-row">
            <Link to={startTo}>
              <button type="button">{s("landing.ctaStart")}</button>
            </Link>
            <a href="#calculator">
              <button type="button" className="ghost">
                {t("landing.calcCta")}
              </button>
            </a>
          </div>
        </div>
      </section>

      <section className="home-section" aria-labelledby="compare-title">
        <div className="wrap">
          <Reveal>
            <div className="home-section-head">
              <p className="home-kicker">{t("landing.compareKicker")}</p>
              <h2 id="compare-title">{t("landing.compareTitle")}</h2>
              <p className="muted">{t("landing.compareLead")}</p>
            </div>
          </Reveal>
          <div className="home-compare">
            <Reveal variant="left">
              <article className="home-compare-card is-before">
                <p className="home-kicker">{t("landing.beforeLabel")}</p>
                <h3>{t("landing.beforeTitle")}</h3>
                <ul>
                  <li>{t("landing.before1")}</li>
                  <li>{t("landing.before2")}</li>
                  <li>{t("landing.before3")}</li>
                </ul>
              </article>
            </Reveal>
            <Reveal variant="right" delay={80}>
              <article className="home-compare-card is-after">
                <p className="home-kicker">{t("landing.afterLabel")}</p>
                <h3>{t("landing.afterTitle")}</h3>
                <ul>
                  <li>{t("landing.after1")}</li>
                  <li>{t("landing.after2")}</li>
                  <li>{t("landing.after3")}</li>
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="home-section home-section-alt" id="calculator" aria-labelledby="calc-title">
        <div className="wrap">
          <Reveal>
            <div className="home-section-head">
              <p className="home-kicker">{t("landing.calcKicker")}</p>
              <h2 id="calc-title">{t("landing.calcTitle")}</h2>
              <p className="muted">{t("landing.calcLead")}</p>
            </div>
          </Reveal>

          <div className="home-calc">
            <div className="home-calc-controls">
              <label className="home-calc-field">
                <span>{t("landing.calcMonths")}</span>
                <div className="home-calc-months">
                  <strong>{months}</strong>
                  <input
                    type="range"
                    min={1}
                    max={24}
                    value={months}
                    onChange={(e) => setMonths(Number(e.target.value))}
                    aria-valuemin={1}
                    aria-valuemax={24}
                    aria-valuenow={months}
                  />
                </div>
              </label>

              <label className="home-calc-field">
                <span>
                  {t("landing.calcMonthly")}
                  {tariffName ? ` · ${tariffName}` : ""}
                </span>
                <input
                  type="number"
                  min={500}
                  step={100}
                  value={monthly}
                  onChange={(e) => setMonthly(Math.max(0, Number(e.target.value) || 0))}
                />
              </label>

              <div className="home-calc-toggle" role="group" aria-label={t("landing.calcMode")}>
                <button
                  type="button"
                  className={!withCoach ? "is-on" : ""}
                  onClick={() => setWithCoach(false)}
                >
                  {t("landing.calcSolo")}
                </button>
                <button
                  type="button"
                  className={withCoach ? "is-on" : ""}
                  onClick={() => setWithCoach(true)}
                >
                  {t("landing.calcCoach")}
                </button>
              </div>
              <p className="muted home-calc-hint">
                {withCoach ? t("landing.calcCoachHint") : t("landing.calcSoloHint")}
              </p>
            </div>

            <div className="home-calc-result" aria-live="polite">
              <p className="home-kicker">{t("landing.calcResultLabel")}</p>
              <p className="home-calc-sum">
                {formatSom(calc.total, locale)} <span>{t("pay.currency")}</span>
              </p>
              <p className="muted">
                {t("landing.calcPerMonth", {
                  amount: formatSom(calc.perMonth, locale),
                  months,
                })}
              </p>
              <Link to="/memberships" className="home-calc-cta">
                <button type="button">{t("landing.calcGoPay")}</button>
              </Link>
              <p className="muted home-calc-note">{t("landing.calcDisclaimer")}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="wrap home-close">
          <Reveal>
            <h2>{t("landing.closingTitle")}</h2>
            <p className="muted">{t("landing.closingLead")}</p>
            <div className="cta-row">
              <Link to={startTo}>
                <button type="button">{s("landing.ctaStart")}</button>
              </Link>
              <Link to="/about">
                <button type="button" className="ghost">
                  {s("landing.ctaAbout")}
                </button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
