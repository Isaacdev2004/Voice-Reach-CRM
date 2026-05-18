type ClerkErrorShape = {
  errors?: { code?: string; longMessage?: string; message?: string }[];
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeVerificationCode(code: string): string {
  return code.replace(/\s/g, "").trim();
}

export function getClerkErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "errors" in error) {
    return (error as ClerkErrorShape).errors?.[0]?.code;
  }
  return undefined;
}

export function clerkErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "errors" in error) {
    const errors = (error as ClerkErrorShape).errors;
    if (errors?.[0]?.longMessage) return errors[0].longMessage;
    if (errors?.[0]?.message) return errors[0].message;
  }
  return fallback;
}

/** Clerk may report the email as already verified while sign-up can still be completed. */
export function isAlreadyVerifiedError(error: unknown): boolean {
  const code = getClerkErrorCode(error);
  return code === "verification_already_verified" || code === "form_code_already_verified";
}

type SignUpLike = {
  status: string | null;
  createdSessionId: string | null;
};

export function resolveSignUpSessionId(
  attempt: SignUpLike,
  signUp: SignUpLike | null | undefined,
): string | null {
  return attempt.createdSessionId ?? signUp?.createdSessionId ?? null;
}

export function isSignUpComplete(attempt: SignUpLike, signUp: SignUpLike | null | undefined): boolean {
  return attempt.status === "complete" || signUp?.status === "complete";
}
