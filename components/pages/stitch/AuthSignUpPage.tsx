"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { ClerkSignUp } from "@/components/auth/clerk-sign-up";
import { InAppBrowserBanner } from "@/components/auth/in-app-browser-banner";
import { SignUpFormDev } from "@/components/auth/sign-up-form-dev";
import { Suspense } from "react";

type AuthSignUpPageProps = {
  clerkEnabled: boolean;
};

export function AuthSignUpPage({ clerkEnabled }: AuthSignUpPageProps) {
  return (
    <AuthShell mode="sign-up">
      {clerkEnabled ? <InAppBrowserBanner context="sign-in" /> : null}
      {clerkEnabled ? (
        <Suspense
          fallback={
            <div className="w-full rounded-[24px] border border-outline-variant/15 bg-ivory px-6 py-10 text-center shadow-card">
              <p className="text-[15px] text-slate-text">Loading…</p>
            </div>
          }
        >
          <ClerkSignUp />
        </Suspense>
      ) : (
        <SignUpFormDev />
      )}
    </AuthShell>
  );
}
