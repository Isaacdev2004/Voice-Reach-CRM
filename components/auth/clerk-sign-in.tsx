"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";

export function ClerkSignIn() {
  return (
    <div className="w-full rounded-[20px] border border-outline-variant/20 bg-ivory px-6 py-7 shadow-card sm:px-8">
      <div className="mb-5 text-center">
        <h2 className="font-serif text-[24px] font-semibold text-ink">Welcome back</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-slate-text">
          Sign in to access your dashboard
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

      <p className="mt-5 text-center text-[14px] text-slate-text">
        Don&apos;t have an account?{" "}
        <Link className="font-semibold text-rose-gold-deep hover:underline" href="/sign-up">
          Sign up
        </Link>
      </p>
    </div>
  );
}
