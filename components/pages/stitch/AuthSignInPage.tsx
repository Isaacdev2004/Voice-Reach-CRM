"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { ClerkSignIn } from "@/components/auth/clerk-sign-in";
import { InAppBrowserBanner } from "@/components/auth/in-app-browser-banner";
import { SignInFormDev } from "@/components/auth/sign-in-form-dev";

type AuthSignInPageProps = {
  clerkEnabled: boolean;
};

export function AuthSignInPage({ clerkEnabled }: AuthSignInPageProps) {
  return (
    <AuthShell>
      {clerkEnabled ? <InAppBrowserBanner context="sign-in" /> : null}
      {clerkEnabled ? <ClerkSignIn /> : <SignInFormDev />}
    </AuthShell>
  );
}
