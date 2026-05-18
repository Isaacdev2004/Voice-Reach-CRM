"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { ClerkSignIn } from "@/components/auth/clerk-sign-in";
import { SignInFormDev } from "@/components/auth/sign-in-form-dev";

type AuthSignInPageProps = {
  clerkEnabled: boolean;
};

export function AuthSignInPage({ clerkEnabled }: AuthSignInPageProps) {
  return (
    <AuthShell>
      {clerkEnabled ? <ClerkSignIn /> : <SignInFormDev />}
    </AuthShell>
  );
}
