"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";

export function ClerkSignIn() {
  return (
    <div className="auth-credential-card">
      <div className="mb-6">
        <h2 className="font-serif text-[28px] font-semibold text-ink">
          Welcome back.
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
          Your relationships, plans, and next opportunities await.
        </p>
      </div>

      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={AUTH_AFTER_URL}
        forceRedirectUrl={AUTH_AFTER_URL}
        appearance={clerkAppearance}
      />

      <p className="mt-6 text-center text-[14px] text-slate-text">
        Don&apos;t have an account?{" "}
        <Link
          className="font-semibold text-rose-gold-deep hover:underline"
          href="/sign-up"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
