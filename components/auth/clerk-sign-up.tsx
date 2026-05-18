"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";

export function ClerkSignUp() {
  return (
    <div className="auth-card-shadow rounded-[24px] border border-outline-variant/20 bg-surface-container-lowest p-lg md:p-xl">
      <div className="mb-lg">
        <h2 className="font-headline-md text-headline-md text-ink">Create your account</h2>
        <p className="font-body-md text-body-md mt-xs text-on-surface-variant">
          Start your enterprise trial in minutes
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

      <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
        Already have an account?{" "}
        <Link className="font-bold text-secondary hover:underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </div>
  );
}
