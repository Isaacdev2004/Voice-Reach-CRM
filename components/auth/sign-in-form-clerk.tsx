"use client";

import { useUser } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthError, AuthField, AuthSubmitButton } from "@/components/auth/auth-fields";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";
import { clerkErrorMessage, getClerkErrorCode, normalizeEmail } from "@/lib/clerk-auth-utils";

export function SignInFormClerk() {
  const router = useRouter();
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userLoaded && isSignedIn) {
      router.replace(AUTH_AFTER_URL);
    }
  }, [userLoaded, isSignedIn, router]);

  async function completeSignIn(sessionId: string | null) {
    if (!sessionId || !setActive) {
      setError("Sign-in could not be completed. Try again.");
      return;
    }
    await setActive({ session: sessionId });
    await router.refresh();
    router.replace(AUTH_AFTER_URL);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setError("");
    setLoading(true);
    try {
      const identifier = normalizeEmail(email);
      const result = await signIn.create({ identifier, password });

      if (result.status === "complete") {
        await completeSignIn(result.createdSessionId);
        return;
      }

      if (result.status === "needs_second_factor") {
        setError("Two-factor authentication is required for this account.");
        return;
      }

      if (result.status === "needs_new_password") {
        setError("You must reset your password before signing in.");
        return;
      }

      setError("Additional verification is required. Try Google or Microsoft sign-in.");
    } catch (err) {
      const code = getClerkErrorCode(err);

      if (code === "form_identifier_not_found") {
        setError(
          "No account found for this email. Complete sign-up first, or check for typos in your email address.",
        );
        return;
      }

      if (code === "form_password_incorrect") {
        setError("Incorrect password. Try again or reset your password in Clerk.");
        return;
      }

      if (code === "form_param_format_invalid") {
        setError("Enter a valid email address.");
        return;
      }

      setError(clerkErrorMessage(err, "Could not sign in. Check your email and password."));
    } finally {
      setLoading(false);
    }
  }

  async function onOAuth(strategy: "oauth_google" | "oauth_microsoft") {
    if (!isLoaded || !signIn) return;
    setError("");
    setLoading(true);
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sign-in",
        redirectUrlComplete: AUTH_AFTER_URL,
      });
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not continue with OAuth."));
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Enter your credentials to access your dashboard"
      footer={
        <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
          Don&apos;t have an account?{" "}
          <Link className="font-bold text-secondary hover:underline" href="/sign-up">
            Sign up
          </Link>
        </p>
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
        onGoogle={() => onOAuth("oauth_google")}
        onMicrosoft={() => onOAuth("oauth_microsoft")}
      />
    </AuthCard>
  );
}
