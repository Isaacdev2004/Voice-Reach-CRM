"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthError, AuthField, AuthSubmitButton } from "@/components/auth/auth-fields";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";

export function SignInFormDev() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    router.push(AUTH_AFTER_URL);
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Enter your credentials to access your dashboard"
      footer={
        <>
          <p className="mt-sm rounded-xl bg-surface-container-low px-sm py-xs text-center font-caption text-caption text-on-surface-variant">
            Clerk is not configured — sign-in will take you to the dashboard for local preview only.
          </p>
          <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
            Don&apos;t have an account?{" "}
            <Link className="font-bold text-secondary hover:underline" href="/sign-up">
              Sign up
            </Link>
          </p>
        </>
      }
    >
      <form className="space-y-sm" onSubmit={onSubmit}>
        <AuthError message={error} />
        <AuthField
          id="email"
          label="Email Address"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          labelExtra={
            <span className="font-label-md text-label-md text-secondary">Forgot?</span>
          }
        />
        <AuthSubmitButton loading={loading} loadingLabel="Signing in…">
          Sign in
        </AuthSubmitButton>
      </form>
      <OAuthButtons
        disabled={loading}
        onGoogle={() => router.push(AUTH_AFTER_URL)}
        onMicrosoft={() => router.push(AUTH_AFTER_URL)}
      />
    </AuthCard>
  );
}
