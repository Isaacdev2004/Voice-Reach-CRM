"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { planById } from "@/lib/billing/plans";
import { clearPendingPlan, rememberPendingPlan } from "@/lib/billing/pending-plan";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function ClerkSignUp() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const sessionId = searchParams.get("session_id");
  const paidFlag = searchParams.get("paid") === "1";
  const selected = plan && planById(plan) ? planById(plan)! : null;

  const [paidOk, setPaidOk] = useState<boolean | null>(sessionId || paidFlag ? null : false);
  const [paidPlanName, setPaidPlanName] = useState<string | null>(selected?.name ?? null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    if (selected) rememberPendingPlan(selected.id);
  }, [selected?.id]);

  useEffect(() => {
    if (!sessionId) {
      setPaidOk(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/billing/claim?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !(data as { paid?: boolean }).paid) {
          setPaidOk(false);
          setVerifyError(
            (data as { error?: string }).error ??
              "Payment not confirmed yet. Go back and complete Stripe checkout.",
          );
          return;
        }
        setPaidOk(true);
        setPaidPlanName((data as { planName?: string }).planName ?? selected?.name ?? null);
        const planId = (data as { planId?: string }).planId;
        if (planId) rememberPendingPlan(planId);
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("ari_checkout_session_id", sessionId);
        }
      } catch {
        if (!cancelled) {
          setPaidOk(false);
          setVerifyError("Could not verify payment. Please try checkout again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, selected?.name]);

  // After Clerk finishes, claim the paid session for this user (dashboard also claims once)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.sessionStorage.getItem("ari_checkout_session_id");
    if (!id) return;

    let attempts = 0;
    const claim = async () => {
      attempts += 1;
      try {
        const res = await fetch("/api/billing/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id }),
        });
        if (res.ok) {
          window.sessionStorage.removeItem("ari_checkout_session_id");
          clearPendingPlan();
          return true;
        }
      } catch {
        /* dashboard claim is the fallback */
      }
      return false;
    };

    void claim();
    const t = window.setInterval(() => {
      void claim().then((ok) => {
        if (ok || attempts >= 8) window.clearInterval(t);
      });
    }, 3000);
    return () => window.clearInterval(t);
  }, []);

  if (paidOk === null) {
    return (
      <div className="w-full rounded-[24px] border border-outline-variant/15 bg-ivory px-6 py-10 text-center shadow-card">
        <p className="text-[15px] text-slate-text">Confirming your Stripe payment…</p>
      </div>
    );
  }

  if (!paidOk) {
    return (
      <div className="w-full rounded-[24px] border border-outline-variant/15 bg-ivory px-6 py-8 shadow-card sm:px-8">
        <h2 className="font-serif text-[28px] font-semibold text-ink">Payment required first</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
          Choose a plan and complete Stripe checkout before creating your account. This keeps
          free sign-ups from skipping payment.
        </p>
        {verifyError ? (
          <p className="mt-4 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-[13px] text-error">
            {verifyError}
          </p>
        ) : null}
        <Link
          href={plan ? `/checkout?plan=${plan}` : "/checkout?plan=growth"}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-rose-gold px-6 py-3.5 text-[15px] font-medium text-ivory"
        >
          Choose plan &amp; pay
        </Link>
        <p className="mt-4 text-center text-[14px] text-slate-text">
          Already have an account?{" "}
          <Link className="font-semibold text-rose-gold-deep hover:underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[24px] border border-outline-variant/15 bg-ivory px-6 py-8 shadow-card sm:px-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-muted">
          Step 2 of 2 · Payment confirmed
        </p>
        <h2 className="mt-2 font-serif text-[28px] font-semibold text-ink">Create your login</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
          {paidPlanName
            ? `You're set on ${paidPlanName}. Create your account to open the dashboard.`
            : "Payment received. Create your account to open the dashboard."}
        </p>
      </div>

      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl={AUTH_AFTER_URL}
        forceRedirectUrl={AUTH_AFTER_URL}
        appearance={clerkAppearance}
      />

      <p className="mt-6 text-center text-[14px] text-slate-text">
        Already have an account?{" "}
        <Link className="font-semibold text-rose-gold-deep hover:underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </div>
  );
}
