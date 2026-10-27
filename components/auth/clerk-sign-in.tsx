"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authModeHref } from "@/lib/auth-presentation";
import { luxuryAuthAppearance } from "@/lib/clerk-appearance";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";

export function ClerkSignIn() {
  const search = useSearchParams().toString();
  return (
    <div className="auth-credential-card">
      <div className="auth-copy mb-6">
        <h2 className="font-serif text-[28px] font-semibold text-ink">
          Welcome back
          <br />
          <em>to what’s possible.</em>
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
          Your relationships. Your opportunities.
          <br />
          Your business, beautifully connected.
        </p>
      </div>

      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={AUTH_AFTER_URL}
        forceRedirectUrl={AUTH_AFTER_URL}
        appearance={luxuryAuthAppearance}
      />

      <p className="mt-6 text-center text-[14px] text-slate-text">
        Don&apos;t have an account?{" "}
        <Link
          className="font-semibold text-rose-gold-deep hover:underline"
          href={authModeHref("/sign-up", search)}
        >
          Create an account →
        </Link>
      </p>
    </div>
  );
}
