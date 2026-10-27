"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import {
  activatePendingTrialIfNeeded,
  stashPlanFromQuery,
} from "@/lib/billing/activate-trial-client";
import { clearPendingPlan } from "@/lib/billing/pending-plan";
import { luxuryAuthAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";
import { FOUNDING_100 } from "@/lib/marketing/founding";
import { handleTrialClaimSuccess } from "@/lib/marketing/trial-tracking";
import { trackMarketingEvent } from "@/lib/marketing/track";
import { readUtmAttribution } from "@/lib/marketing/utm";
import { authModeHref } from "@/lib/auth-presentation";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function ClerkSignUp() {
  const { isLoaded, isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const planParam = searchParams.get("plan");
  const billingParam = searchParams.get("billing");
  const attributionSent = useRef(false);
  const trialActivated = useRef(false);

  useEffect(() => {
    stashPlanFromQuery(planParam, billingParam);
  }, [planParam, billingParam]);

  // After new sign-up: attach paid session if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionId) {
      window.sessionStorage.setItem("ari_checkout_session_id", sessionId);
    }
    const id =
      sessionId || window.sessionStorage.getItem("ari_checkout_session_id");
    if (!id || !isSignedIn) return;

    void (async () => {
      try {
        const res = await fetch("/api/billing/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            planId?: string;
            planPrice?: number;
            trialing?: boolean;
          };
          window.sessionStorage.removeItem("ari_checkout_session_id");
          clearPendingPlan();
          if (data.planId && data.trialing) {
            handleTrialClaimSuccess({
              planId: data.planId,
              planPrice: data.planPrice ?? 0,
              trialing: true,
            });
          }
        }
      } catch {
        /* optional */
      }
    })();
  }, [sessionId, isSignedIn]);

  // Cardless trial: start Stripe subscription after account exists (legacy checkout sessions still use claim above)
  useEffect(() => {
    if (!isSignedIn || sessionId || trialActivated.current) return;
    void (async () => {
      const ok = await activatePendingTrialIfNeeded();
      if (ok) trialActivated.current = true;
    })();
  }, [sessionId, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || attributionSent.current) return;
    attributionSent.current = true;
    trackMarketingEvent("signup_started", { flow: "clerk" });
    const utm = readUtmAttribution();
    void fetch("/api/marketing/attribution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(utm),
    }).catch(() => undefined);
  }, [isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="w-full rounded-[24px] border border-outline-variant/15 bg-ivory px-6 py-10 text-center shadow-card">
        <p className="text-[15px] text-slate-text">Loading...</p>
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="w-full rounded-[24px] border border-outline-variant/15 bg-ivory px-6 py-10 text-center shadow-card">
        <p className="text-[15px] text-slate-text">
          You&apos;re already signed in. Redirecting…
        </p>
        <Link
          href={AUTH_AFTER_URL}
          className="mt-4 inline-block text-[14px] font-medium text-rose-gold-deep hover:underline"
        >
          Go to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-credential-card">
      <div className="auth-copy mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
          {FOUNDING_100.trialDays}-day free trial · No credit card
        </p>
        <h2 className="mt-2 font-serif text-[28px] font-semibold text-ink">
          Your next chapter
          <br />
          <em>starts here.</em>
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
          A more beautiful way to grow your business.
          <span className="auth-signup-support">
            More meaningful connections. Smarter follow-up. More room for what
            matters.
          </span>
        </p>
      </div>

      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl={AUTH_AFTER_URL}
        forceRedirectUrl={AUTH_AFTER_URL}
        appearance={luxuryAuthAppearance}
      />

      <p className="mt-6 text-center text-[14px] text-slate-text">
        Already have an account?{" "}
        <Link
          className="font-semibold text-rose-gold-deep hover:underline"
          href={authModeHref("/sign-in", searchParams.toString())}
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
