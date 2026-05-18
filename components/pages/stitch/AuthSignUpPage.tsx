"use client";

import { AuthShell } from "@/components/auth/auth-shell";
import { ClerkSignUp } from "@/components/auth/clerk-sign-up";
import { SignUpFormDev } from "@/components/auth/sign-up-form-dev";

type AuthSignUpPageProps = {
  clerkEnabled: boolean;
};

export function AuthSignUpPage({ clerkEnabled }: AuthSignUpPageProps) {
  return (
    <AuthShell>
      {clerkEnabled ? <ClerkSignUp /> : <SignUpFormDev />}
    </AuthShell>
  );
}
