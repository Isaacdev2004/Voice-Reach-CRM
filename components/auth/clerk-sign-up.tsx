"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { planById } from "@/lib/billing/plans";
import { rememberPendingPlan } from "@/lib/billing/pending-plan";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function ClerkSignUp() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const selected = plan && planById(plan) ? planById(plan)! : null;
  // Always land on dashboard; pending plan in localStorage kicks off Stripe
  // (ClerkProvider fallback often strips ?plan= from the URL).
  const afterUrl = AUTH_AFTER_URL;

  useEffect(() => {
    rememberPendingPlan(selected?.id ?? null);
  }, [selected?.id]);

  return (
    <div className="w-full rounded-[24px] border border-outline-variant/15 bg-ivory px-6 py-8 shadow-card sm:px-8">
      <div className="mb-6">
        <h2 className="font-serif text-[28px] font-semibold text-ink">Create account</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
          {selected
            ? `Create your account, then you’ll complete Stripe checkout for the ${selected.name} plan ($${selected.price}/mo).`
            : "Create your account — you’ll choose a plan and pay securely with Stripe next."}
        </p>
        {selected ? (
          <p className="mt-3 rounded-xl bg-champagne/70 px-4 py-2 text-[13px] font-medium text-ink">
            Selected: {selected.name} · ${selected.price}/mo
          </p>
        ) : null}
      </div>

      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
        fallbackRedirectUrl={afterUrl}
        forceRedirectUrl={afterUrl}
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
