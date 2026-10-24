"use client";
import { AiPlanChangeReview } from "./ai-plan-change";
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
    [error, setError] = useState("");
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
  return (
    <section className="reviews-referrals ai-usage-panel">
      <h2 className="font-serif text-2xl">Your AI usage</h2>
      <AiNewSubscriptionReview />
      <p>
        {data?.entitlement?.tier
          ? `AI Plus included · ${data.entitlement.crmPlan ?? "Verified CRM plan"}`
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
      <AiPlanChangeReview hasAi={!!data?.entitlement?.tier} />
      <p>
        AI Plus is included in the AI base plan. There is no separate AI add-on
        charge. Existing annual subscriptions are unchanged.
      </p>
    </section>
  );
}
