import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

export function PaymentSuccessPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const paymentId = params.get("paymentId");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId || !user) return;
    let cancelled = false;
    let tries = 0;

    async function tick() {
      tries += 1;
      try {
        const res = await api.paymentStatus(paymentId!);
        if (cancelled) return;
        setStatus(res.payment.status);
        if (res.payment.status !== "SUCCEEDED" && tries < 40) {
          window.setTimeout(() => void tick(), 2000);
        }
      } catch {
        if (!cancelled && tries < 40) {
          window.setTimeout(() => void tick(), 2000);
        }
      }
    }

    void tick();
    return () => {
      cancelled = true;
    };
  }, [paymentId, user]);

  const ok = status === "SUCCEEDED";

  return (
    <div className="wrap section">
      <div className="card" style={{ maxWidth: 520 }}>
        <p className="kicker">{t("appName")}</p>
        <h1>{ok ? t("pay.success") : t("pay.waitingTitle")}</h1>
        <p className="lead">{ok ? t("pay.successLead") : t("pay.waitingLead")}</p>
        {!ok && status && <p className="muted">{status}</p>}
        <div className="row" style={{ marginTop: "1rem" }}>
          <Link to="/cabinet">
            <button type="button">{t("nav.cabinet")}</button>
          </Link>
          <Link to="/memberships">
            <button type="button" className="ghost">
              {t("nav.memberships")}
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
