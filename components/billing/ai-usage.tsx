"use client";
import { AiNewSubscriptionReview } from "./ai-new-subscription";
import { useEffect, useState } from "react";
type Usage = {
  capability: string;
  label: string;
  limit: number;
  used: number;
  reserved: number;
  remaining: number;
  state: string;
};
const displayUnits = (capability: string, units: number) =>
  capability.endsWith("_seconds")
    ? (units / 60).toLocaleString(undefined, { maximumFractionDigits: 2 })
    : units.toLocaleString();
export function AiUsagePanel() {
  const [data, setData] = useState<{
      entitlement?: {
        tier: string | null;
        crmPlan: string | null;
        reason?: string;
      };
      usage: Usage[] | null;
      resetAt?: string;
      notice?: string;
    } | null>(null),
    [error, setError] = useState(""),
    [quote, setQuote] = useState<Record<string, unknown> | null>(null),
    [busy, setBusy] = useState(false),
    [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/billing/ai/usage", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        if (live) setData(d);
      })
      .catch(() => {
        if (live)
          setError(
            "AI usage could not be verified. Existing CRM settings are unchanged.",
          );
      });
    return () => {
      live = false;
    };
  }, []);
  async function upgrade() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch(
          "/api/billing/ai/upgrade",
          quote
            ? {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  quoteId: quote.quoteId,
                  digest: quote.digest,
                  confirmation: "CONFIRM_AI_PRO_UPGRADE",
                }),
              }
            : {},
        ),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (quote) {
        setQuote(null);
        setConfirmed(false);
        setError(
          d.notice ?? "Billing updated; refresh to verify authoritative usage.",
        );
      } else setQuote(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Billing preview unavailable");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="reviews-referrals ai-usage-panel">
      <h2 className="font-serif text-2xl">Your AI usage</h2>
      <AiNewSubscriptionReview />
      <p>
        {data?.entitlement?.tier
          ? `AI ${data.entitlement.tier === "pro" ? "Pro" : "Plus"} · ${data.entitlement.crmPlan ?? "Verified CRM plan"}`
          : "AI entitlement not verified"}
      </p>
      {data?.resetAt && (
        <p>Resets {new Date(data.resetAt).toLocaleDateString()}</p>
      )}
      {error && <p role="status">{error}</p>}
      {data?.usage?.map((u) => (
        <article key={u.capability}>
          <div className="assistant-actions">
            <strong>{u.label.replace("seconds", "minutes")}</strong>
            <span>
              {displayUnits(u.capability, u.used)} of{" "}
              {displayUnits(u.capability, u.limit)} used ·{" "}
              {displayUnits(u.capability, u.remaining)} remaining
              {u.reserved
                ? ` · ${displayUnits(u.capability, u.reserved)} pending`
                : ""}
            </span>
          </div>
          <progress
            max={u.limit}
            value={u.used + u.reserved}
            aria-label={`${u.label} used`}
          />
          {u.state !== "available" && (
            <p>
              {u.state === "near_limit"
                ? "You have used at least 80% of this allowance."
                : "This allowance is reached; existing drafts remain available."}
            </p>
          )}
        </article>
      ))}
      <p>{data?.notice ?? data?.entitlement?.reason}</p>
      {data?.entitlement?.tier === "plus" && (
        <button disabled={busy} onClick={() => void upgrade()}>
          Preview AI Pro upgrade
        </button>
      )}
      {quote && (
        <div>
          <h3 className="font-serif text-xl">Review AI Pro billing</h3>
          <p>
            Additional monthly amount: ${String(quote.monthly ?? "unavailable")}
            . Invoice preview: {quote.currency === "usd" ? "$" : ""}
            {typeof quote.amountDue === "number"
              ? (quote.amountDue / 100).toFixed(2)
              : "Unavailable"}
            .
          </p>
          <p>
            Policy: {String(quote.policy ?? "unavailable")}. Effective:{" "}
            {String(quote.effectiveAt ?? "unavailable")}. This preview is not a
            charge.
          </p>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            I approve the displayed billing change.
          </label>
          <button disabled={busy || !confirmed} onClick={() => void upgrade()}>
            Confirm AI Pro upgrade
          </button>
        </div>
      )}
      <p>
        AI Pro never changes CRM feature permissions or team seats. Existing
        subscription migration and downgrade timing require the verified Billing
        portal configuration.
      </p>
    </section>
  );
}
