"use client";

import { useUser } from "@clerk/nextjs";
import { useSignUp } from "@clerk/nextjs/legacy";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthError, AuthField, AuthSubmitButton } from "@/components/auth/auth-fields";
import { ClerkCaptcha } from "@/components/auth/clerk-captcha";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { AUTH_AFTER_URL } from "@/lib/clerk-env";
import {
  clerkErrorMessage,
  isAlreadyVerifiedError,
  isSignUpComplete,
  normalizeEmail,
  normalizeVerificationCode,
  resolveSignUpSessionId,
} from "@/lib/clerk-auth-utils";

export function SignUpFormClerk() {
  const router = useRouter();
  const { isLoaded: userLoaded, isSignedIn } = useUser();
  const { isLoaded, signUp, setActive } = useSignUp();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userLoaded && isSignedIn) {
      router.replace(AUTH_AFTER_URL);
    }
  }, [userLoaded, isSignedIn, router]);

  async function activateSession(sessionId: string | null): Promise<boolean> {
    if (!sessionId || !setActive) {
      setError("Your account was created but we could not start a session. Try signing in.");
      return false;
    }
    await setActive({ session: sessionId });
    await router.refresh();
    router.replace(AUTH_AFTER_URL);
    return true;
  }

  async function completeSignUpIfReady(): Promise<boolean> {
    if (!signUp) return false;
    if (signUp.status !== "complete") return false;
    return activateSession(signUp.createdSessionId);
  }

  async function handleVerificationSubmit(): Promise<void> {
    const code = normalizeVerificationCode(verificationCode);
    if (!code) {
      setError("Enter the verification code from your email.");
      return;
    }

    if (!signUp) {
      setError("Sign-up session expired. Please create your account again.");
      setPendingVerification(false);
      return;
    }

    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });

      if (isSignUpComplete(attempt, signUp)) {
        const sessionId = resolveSignUpSessionId(attempt, signUp);
        const ok = await activateSession(sessionId);
        if (ok) return;
      }

      if (signUp.status === "complete") {
        await activateSession(signUp.createdSessionId);
        return;
      }

      setError(
        "Email verified. Sign in with your email and password to continue.",
      );
      setVerifiedMessage("Your email is verified. You can sign in now.");
    } catch (err) {
      if (isAlreadyVerifiedError(err) || signUp.status === "complete") {
        const completed = await completeSignUpIfReady();
        if (completed) return;

        setVerifiedMessage("Your email is already verified. Sign in below.");
        setError("");
        return;
      }

      setError(
        clerkErrorMessage(
          err,
          "Invalid or expired verification code. Request a new code and try again.",
        ),
      );
    }
  }

  async function resendVerificationCode() {
    if (!signUp) {
      setError("Sign-up session expired. Please create your account again.");
      setPendingVerification(false);
      return;
    }
    setError("");
    setVerifiedMessage("");
    setLoading(true);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifiedMessage("A new verification code was sent to your email.");
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not resend the verification code."));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setError("");
    setVerifiedMessage("");

    if (pendingVerification) {
      setLoading(true);
      try {
        await handleVerificationSubmit();
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = normalizeEmail(email);

      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: normalizedEmail,
        password,
      });

      if (signUp.status === "complete") {
        await activateSession(signUp.createdSessionId);
        return;
      }

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setEmail(normalizedEmail);
      setPendingVerification(true);
      setVerifiedMessage(`We sent a verification code to ${normalizedEmail}.`);
    } catch (err) {
      setError(
        clerkErrorMessage(err, "Could not create your account. Check your details and try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  async function onOAuth(strategy: "oauth_google" | "oauth_microsoft") {
    if (!isLoaded || !signUp) return;
    setError("");
    setLoading(true);
    try {
      await signUp.authenticateWithRedirect({
        strategy,
        redirectUrl: "/sign-up",
        redirectUrlComplete: AUTH_AFTER_URL,
      });
    } catch (err) {
      setError(clerkErrorMessage(err, "Could not continue with OAuth."));
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title={pendingVerification ? "Verify your email" : "Create your account"}
      subtitle={
        pendingVerification
          ? verifiedMessage || "Enter the code we sent to your inbox to finish setting up your account"
          : "Start your enterprise trial in minutes"
      }
      footer={
        <p className="mt-lg text-center font-body-md text-body-md text-on-surface-variant">
          Already have an account?{" "}
          <Link className="font-bold text-secondary hover:underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-sm" onSubmit={onSubmit}>
        <AuthError message={error} />

        {pendingVerification ? (
          <>
            <AuthField
              id="code"
              label="Verification code"
              placeholder="123456"
              value={verificationCode}
              onChange={setVerificationCode}
              autoComplete="one-time-code"
            />
            <button
              type="button"
              disabled={loading}
              onClick={resendVerificationCode}
              className="font-label-md text-label-md text-secondary hover:underline disabled:opacity-60"
            >
              Resend code
            </button>
          </>
        ) : (
          <>
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
            <ClerkCaptcha />
          </>
        )}

        <AuthSubmitButton
          loading={loading}
          loadingLabel={pendingVerification ? "Verifying…" : "Creating account…"}
        >
          {pendingVerification ? "Verify email" : "Create account"}
        </AuthSubmitButton>

        {pendingVerification && verifiedMessage && !error ? (
          <p className="text-center font-caption text-caption text-on-tertiary-container">{verifiedMessage}</p>
        ) : null}
      </form>

      {!pendingVerification && (
        <OAuthButtons
          disabled={loading}
          onGoogle={() => onOAuth("oauth_google")}
          onMicrosoft={() => onOAuth("oauth_microsoft")}
        />
      )}
    </AuthCard>
  );
}
