"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthError, AuthField, AuthSubmitButton } from "@/components/auth/auth-fields";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";

export function SignUpFormDev() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError("Fill in all fields to create your account.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    router.push(AUTH_AFTER_URL);
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Start your enterprise trial in minutes"
      footer={
        <>
          <p className="mt-sm rounded-xl bg-surface-container-low px-sm py-xs text-center font-caption text-caption text-on-surface-variant">
            Clerk is not configured — sign-up will take you to the dashboard for local preview only.
          </p>
          <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
            Already have an account?{" "}
            <Link className="font-bold text-secondary hover:underline" href="/sign-in">
              Sign in
            </Link>
          </p>
        </>
      }
    >
      <form className="space-y-sm" onSubmit={onSubmit}>
        <AuthError message={error} />
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
          <AuthField
            id="firstName"
            label="First name"
            placeholder="Alex"
            value={firstName}
            onChange={setFirstName}
            autoComplete="given-name"
          />
          <AuthField
            id="lastName"
            label="Last name"
            placeholder="Rivera"
            value={lastName}
            onChange={setLastName}
            autoComplete="family-name"
          />
        </div>
        <AuthField
          id="email"
          label="Work email"
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
          placeholder="At least 8 characters"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <AuthField
          id="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
        />
        <AuthSubmitButton loading={loading} loadingLabel="Creating account…">
          Create account
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
