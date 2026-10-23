"use client";
import { formatUsdCents, type MortgageResult } from "@/lib/mortgage/calculate";
import { Icon } from "@/components/ui/icon";
const colors = ["#a77b58", "#cfb093", "#e5d2bc", "#c6cbd1", "#b9a58b"];
export function MortgagePaymentSummary({
  result,
  rate,
  term,
  onReview,
}: {
  result: MortgageResult;
  rate: number;
  term: number;
  onReview?: () => void;
}) {
  const parts = [
    { label: "Principal & interest", value: result.monthlyPrincipalInterest },
    { label: "Property taxes (est.)", value: result.monthlyTax },
    { label: "Home insurance (est.)", value: result.monthlyInsurance },
    { label: "HOA", value: result.monthlyHoa },
    ...(result.monthlyPmi > 0
      ? [{ label: "PMI (est.)", value: result.monthlyPmi }]
      : []),
  ];
  let angle = 0;
  const segments = parts.map((p, i) => {
    const start = angle;
    angle +=
      result.monthlyTotal > 0 ? (p.value / result.monthlyTotal) * 360 : 0;
    return `${colors[i]} ${start}deg ${angle}deg`;
  });
  return (
    <section
      className="fc-card fc-payment-summary"
      aria-label="Estimated monthly payment breakdown"
    >
      <div className="fc-section-heading">
        <h2>Estimated monthly payment</h2>
        {onReview && (
          <button
            className="fc-primary"
            aria-label="Share / create report"
            onClick={onReview}
          >
            <Icon name="ios_share" />
            Share / create report
          </button>
        )}
      </div>
      <div className="fc-payment-grid">
        <div>
          <div className="fc-payment-amount">
            {formatUsdCents(result.monthlyTotal)}
            <span> / month</span>
          </div>
          <p className="fc-muted">
            {result.downPaymentPercent.toFixed(0)}% down · {rate.toFixed(2)}%
            assumed rate · {term}-year term
          </p>
          <dl>
            {parts.map((p) => (
              <div key={p.label}>
                <dt>{p.label}</dt>
                <dd>{formatUsdCents(p.value)}</dd>
              </div>
            ))}
          </dl>
          <div className="fc-payment-total">
            <span>Total monthly estimate</span>
            <b>{formatUsdCents(result.monthlyTotal)}</b>
          </div>
        </div>
        <div className="fc-donut-area">
          <div
            className="fc-payment-donut"
            style={{
              background:
                result.monthlyTotal > 0
                  ? `conic-gradient(${segments.join(",")})`
                  : "#e9e2d9",
            }}
            role="img"
            aria-label={
              result.monthlyTotal > 0
                ? `Monthly cost allocation: ${parts.map((p) => `${p.label} ${formatUsdCents(p.value)}`).join(", ")}`
                : "No payment calculated yet"
            }
          >
            <div>
              <b>{formatUsdCents(result.monthlyTotal)}</b>
              <span>Monthly</span>
            </div>
          </div>
          <ul>
            {parts.map((p, i) => (
              <li key={p.label}>
                <i style={{ background: colors[i] }} />
                <span>{p.label}</span>
                <b>
                  {result.monthlyTotal > 0
                    ? Math.round((p.value / result.monthlyTotal) * 100)
                    : 0}
                  %
                </b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
