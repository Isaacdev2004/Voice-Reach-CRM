"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";

export function ClerkSignIn() {
  return (
    <div className="auth-card-shadow rounded-[24px] border border-outline-variant/20 bg-surface-container-lowest p-lg md:p-xl">
      <div className="mb-lg">
        <h2 className="font-headline-md text-headline-md text-ink">Welcome back</h2>
        <p className="font-body-md text-body-md mt-xs text-on-surface-variant">
          Enter your credentials to access your dashboard
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

      <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
        Don&apos;t have an account?{" "}
        <Link className="font-bold text-secondary hover:underline" href="/sign-up">
          Sign up
        </Link>
      </p>
    </div>
  );
}
