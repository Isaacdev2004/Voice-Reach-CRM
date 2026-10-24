"use client";
import { useState } from "react";
type Quote = {
  quoteId: string;
  digest: string;
  from: { name: string; monthly: number };
  to: { name: string; monthly: number };
  monthlyDifference: number;
  amountDue: number;
  currency: string;
  effectiveAt: string;
  currentPeriodEnd: string;
  policy: string;
  notice: string;
};
export function AiPlanChangeReview({ hasAi }: { hasAi: boolean }) {
  const [quote, setQuote] = useState<Quote | null>(null),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function submit() {
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch("/api/billing/ai/plan-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          quote
            ? {
                operation: "confirm",
                quoteId: quote.quoteId,
                digest: quote.digest,
                confirmation: "CONFIRM_REPLACE_MONTHLY_PLAN",
              }
            : { operation: "preview", choice: hasAi ? "crm" : "ai" },
        ),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error ?? "Billing change unavailable");
      if (quote) {
        setQuote(null);
        setAccepted(false);
        setNotice(d.notice);
      } else setQuote(d);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Billing preview unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="reviews-referrals">
      <h3 className="font-serif text-xl">One subscription. Your choice.</h3>
      <p>
        CRM Only or the same CRM tier with AI Plus included. Monthly AI pricing
        is $16 more; no separate AI add-on. Annual and custom plans require
        separate review.
      </p>
      {!quote && (
        <button disabled={busy} onClick={() => void submit()}>
          {hasAi ? "Review CRM Only" : "Review CRM + AI"}
        </button>
      )}
      {quote && (
        <>
          <p>
            {quote.from.name}: ${quote.from.monthly}/month → {quote.to.name}: $
            {quote.to.monthly}/month.
          </p>
          <p>
            Monthly difference: {quote.monthlyDifference >= 0 ? "+" : "−"}$
            {Math.abs(quote.monthlyDifference)}. Stripe invoice preview:{" "}
            {quote.currency.toUpperCase()} {(quote.amountDue / 100).toFixed(2)}.
          </p>
          <p>
            Requested effective time:{" "}
            {new Date(quote.effectiveAt).toLocaleString()}. Current renewal:{" "}
            {new Date(quote.currentPeriodEnd).toLocaleString()}. Proration:{" "}
            {(
              {
                none: "No prorated adjustment",
                create_prorations: "Prorated charges or credits",
                always_invoice: "Invoice prorated amount immediately",
              } as Record<string, string>
            )[quote.policy] ?? "Review with Billing"}
            . Payment-dependent changes may remain pending.
          </p>
          <p>{quote.notice}</p>
          <label
            style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}
          >
            <input
              type="checkbox"
              style={{
                width: "1rem",
                height: "1rem",
                padding: 0,
                appearance: "auto",
                flexShrink: 0,
                accentColor: "#986a43",
              }}
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            I approve replacing my existing monthly price with the displayed
            price and billing terms.
          </label>
          <button disabled={busy || !accepted} onClick={() => void submit()}>
            Confirm plan replacement
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setQuote(null);
              setAccepted(false);
            }}
          >
            Cancel
          </button>
        </>
      )}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
}
