"use client";

import { SignUp, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { planById } from "@/lib/billing/plans";
import { clearPendingPlan, rememberPendingPlan } from "@/lib/billing/pending-plan";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function ClerkSignUp() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  // After new sign-up: attach paid session if present
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionId) {
      window.sessionStorage.setItem("ari_checkout_session_id", sessionId);
    }
    const id = sessionId || window.sessionStorage.getItem("ari_checkout_session_id");
    if (!id || !isSignedIn) return;

    void (async () => {
      try {
        const res = await fetch("/api/billing/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id }),
        });
        if (res.ok) {
          window.sessionStorage.removeItem("ari_checkout_session_id");
          clearPendingPlan();
        }
      } catch {
        /* optional */
      }
    })();
  }, [sessionId, isSignedIn]);

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
        <p className="text-[15px] text-slate-text">You&apos;re already signed in. Redirecting…</p>
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
    <div className="w-full rounded-[24px] border border-outline-variant/15 bg-ivory px-6 py-8 shadow-card sm:px-8">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
          Get started with ARI
        </p>
        <h2 className="mt-2 font-serif text-[28px] font-semibold text-ink">Create your account</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
          Sign up to access your CRM dashboard and campaign tools.
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
