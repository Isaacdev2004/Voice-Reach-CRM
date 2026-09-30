"use client";

import dynamic from "next/dynamic";
import { AuthShell } from "@/components/auth/auth-shell";
import { InAppBrowserBanner } from "@/components/auth/in-app-browser-banner";
import { SignInFormDev } from "@/components/auth/sign-in-form-dev";

const ClerkSignIn = dynamic(
  () => import("@/components/auth/clerk-sign-in").then((mod) => mod.ClerkSignIn),
  {
    ssr: false,
    loading: () => (
      <div className="w-full rounded-[24px] border border-outline-variant/15 bg-ivory px-6 py-10 text-center shadow-card">
        <p className="text-[15px] text-slate-text">Loading sign in…</p>
      </div>
    ),
  },
);

type AuthSignInPageProps = {
  clerkEnabled: boolean;
};

export function AuthSignInPage({ clerkEnabled }: AuthSignInPageProps) {
  return (
    <AuthShell mode="sign-in">
      {clerkEnabled ? <InAppBrowserBanner context="sign-in" /> : null}
      {clerkEnabled ? <ClerkSignIn /> : <SignInFormDev />}
    </AuthShell>
  );
}
