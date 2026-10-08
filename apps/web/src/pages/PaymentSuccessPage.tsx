import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

const FAILED = ["FAILED", "CANCELED", "EXPIRED", "REFUNDED", "CHARGEBACK"];

export function PaymentSuccessPage() {
  const { t } = useTranslation();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const paymentId = params.get("paymentId");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    let tries = 0;

    async function tick() {
      tries += 1;
      try {
        const res = await api.paymentStatus(paymentId!);
        if (cancelled) return;
        setStatus(res.payment.status);
        if (res.payment.status === "SUCCEEDED") {
          await refresh();
          if (!cancelled) navigate("/app", { replace: true });
          return;
        }
        if (FAILED.includes(res.payment.status)) return;
      } catch {
        /* повторим */
      }
      if (!cancelled && tries < 90) window.setTimeout(() => void tick(), 2000);
    }

    void tick();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  const failed = status !== null && FAILED.includes(status);

  return (
    <div className="wrap app-page">
      <div className="card" style={{ maxWidth: 520 }}>
        <p className="kicker">{t("appName")}</p>
        <h1>{failed ? t("pay.failedTitle") : status === "SUCCEEDED" ? t("pay.success") : t("pay.waitingTitle")}</h1>
        <p className="lead">{failed ? t("pay.failedLead") : status === "SUCCEEDED" ? t("pay.successLead") : t("pay.waitingLead")}</p>
        {failed && (
          <div className="row" style={{ marginTop: "1rem" }}>
            <Link to="/login">
              <button type="button">{t("pay.tryAgain")}</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
