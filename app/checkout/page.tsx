"use client";

import { planById, PLAN_OPTIONS, type PlanId } from "@/lib/billing/plans";
import { rememberPendingPlan } from "@/lib/billing/pending-plan";
import { cn } from "@/lib/cn";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function CheckoutInner() {
  const searchParams = useSearchParams();
  const initial = searchParams.get("plan");
  const canceled = searchParams.get("canceled") === "1";

  const [planId, setPlanId] = useState<PlanId>(
    initial && planById(initial) ? (initial as PlanId) : "growth",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial && planById(initial)) setPlanId(initial as PlanId);
  }, [initial]);

  const selected = planById(planId)!;

  const startPay = async () => {
    setLoading(true);
    setError(null);
    rememberPendingPlan(planId);
    try {
      const res = await fetch("/api/billing/checkout-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? "Could not start Stripe checkout",
        );
      }
      const url = (data as { url?: string }).url;
      if (!url) throw new Error("Stripe checkout URL missing");
      window.location.assign(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-12">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
        Step 1 of 2 · Pay first
      </p>
      <h1 className="mt-2 font-serif text-[36px] font-semibold text-ink">Choose your plan</h1>
      <p className="mt-2 text-[15px] text-slate-text">
        Pay securely with Stripe, then create your account. Nothing unlocks until payment
        completes.
      </p>

      {canceled ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[14px] text-amber-950">
          Checkout was canceled. Pick a plan below to try again.
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {PLAN_OPTIONS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setPlanId(plan.id)}
            className={cn(
              "rounded-2xl border p-5 text-left transition-all",
              planId === plan.id
                ? "border-rose-gold-deep bg-rose-gold/10 ring-2 ring-rose-gold/30"
                : "border-outline-variant/20 bg-ivory hover:border-rose-gold/40",
            )}
          >
            <p className="font-serif text-[20px] font-semibold text-ink">{plan.name}</p>
            <p className="mt-1 font-serif text-[28px] text-ink">
              ${plan.price}
              <span className="text-[14px] font-normal text-taupe">/mo</span>
            </p>
            <p className="mt-2 text-[12px] text-taupe">{plan.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-outline-variant/15 bg-champagne/40 p-6">
        <p className="font-medium text-ink">
          Selected: {selected.name} · ${selected.price}/mo
        </p>
        <ul className="mt-3 space-y-1 text-[13px] text-slate-text">
          {selected.features.slice(0, 4).map((f) => (
            <li key={f}>· {f}</li>
          ))}
        </ul>

        {error ? (
          <p className="mt-4 rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={loading}
          onClick={() => void startPay()}
          className="mt-5 w-full rounded-full bg-rose-gold px-6 py-3.5 text-[15px] font-medium text-ivory disabled:opacity-50"
        >
          {loading ? "Opening Stripe…" : `Pay $${selected.price}/mo with Stripe`}
        </button>
        <p className="mt-3 text-center text-[12px] text-taupe">
          After payment you’ll create your login (step 2).
        </p>
      </div>

        <p className="mt-8 text-center text-[13px] text-taupe">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-rose-gold-deep hover:underline">
            Sign in
          </Link>
          {" · "}
          <Link href="/" className="hover:underline">
            Back to home
          </Link>
        </p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-taupe">Loading…</div>
      }
    >
      <CheckoutInner />
    </Suspense>
  );
}
