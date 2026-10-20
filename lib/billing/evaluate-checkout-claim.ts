import { planById, type PlanId } from "@/lib/billing/plans";

export type CheckoutClaimInput = {
  sessionStatus: string;
  paymentStatus: string;
  planId: string;
  boundOwnerId: string | null;
  claimedOwnerId: string | null;
  requestingOwnerId: string;
  checkoutEmail: string | null;
  clerkEmail: string | null;
};

export type CheckoutClaimResult =
  | { ok: true; planId: PlanId }
  | { ok: false; status: number; code: string; message: string };

export function evaluateCheckoutClaim(input: CheckoutClaimInput): CheckoutClaimResult {
  if (input.sessionStatus !== "complete") {
    return {
      ok: false,
      status: 400,
      code: "unpaid_session",
      message: "This checkout session is not complete yet.",
    };
  }

  const paid =
    input.paymentStatus === "paid" || input.paymentStatus === "no_payment_required";
  if (!paid) {
    return {
      ok: false,
      status: 400,
      code: "unpaid_session",
      message: "This checkout session has not been paid.",
    };
  }

  const planId = input.planId as PlanId;
  if (!planById(planId)) {
    return {
      ok: false,
      status: 400,
      code: "invalid_plan",
      message: "Checkout session is missing a valid plan.",
    };
  }

  const priorOwner = input.claimedOwnerId?.trim() || null;
  if (priorOwner && priorOwner !== input.requestingOwnerId) {
    return {
      ok: false,
      status: 403,
      code: "session_already_claimed",
      message: "This checkout session is already linked to another account.",
    };
  }

  const boundOwner = input.boundOwnerId?.trim() || null;
  if (boundOwner && boundOwner !== input.requestingOwnerId) {
    return {
      ok: false,
      status: 403,
      code: "session_owner_mismatch",
      message: "This checkout session belongs to a different account.",
    };
  }

  const checkoutEmail = input.checkoutEmail?.trim().toLowerCase() || null;
  const clerkEmail = input.clerkEmail?.trim().toLowerCase() || null;
  if (!boundOwner && !priorOwner && checkoutEmail && clerkEmail && checkoutEmail !== clerkEmail) {
    return {
      ok: false,
      status: 403,
      code: "email_mismatch",
      message: "Sign in with the email used at checkout to activate this plan.",
    };
  }

  return { ok: true, planId };
}
