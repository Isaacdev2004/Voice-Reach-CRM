"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { planById } from "@/lib/billing/plans";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";
import { useSearchParams } from "next/navigation";

export function ClerkSignUp() {
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");
  const afterUrl = plan && planById(plan) ? `/dashboard?plan=${plan}` : AUTH_AFTER_URL;

  return (
    <div className="w-full rounded-[24px] border border-outline-variant/15 bg-ivory px-6 py-8 shadow-card sm:px-8">
      <div className="mb-6">
        <h2 className="font-serif text-[28px] font-semibold text-ink">Create account</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
          {plan && planById(plan)
            ? `Create your account, then complete checkout for the ${planById(plan)!.name} plan.`
            : "Start your trial — set up contacts, voice scripts, and campaigns in minutes."}
        </p>
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
