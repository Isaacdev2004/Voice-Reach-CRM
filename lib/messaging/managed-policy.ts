/** Sender readiness is independent of provider key presence and subscriber self-attestation. */
export type ManagedChannel = "sms" | "email" | "voicemail";
export type SetupState = "pending_verification" | "ready" | "action_required";
export type SubscriptionEvidence = { verified: boolean; status: string; trialEndsAt?: string };
export type SenderEvidence = {
  ownerId: string; channel: ManagedChannel; sender: string; dedicated: boolean;
  providerVerified: boolean; registration: "pending" | "approved" | "rejected";
  providerTermsApproved: boolean; inboundVerified: boolean; deliveryVerified: boolean;
  credentialScopeVerified: boolean; quotaEnforcementVerified: boolean;
  setupVersion: string; expiresAt?: string; suspended: boolean;
};
export const PROPOSED_TRIAL_ALLOWANCES = { smsSegments: 25, emails: 100, voicemailDrops: 5, dailyAiInteractions: 5 } as const;
export function subscriptionMayUseMessaging(s: SubscriptionEvidence, now = Date.now()) {
  if (!s.verified) return false;
  if (s.status === "active") return true;
  return s.status === "trialing" && !!s.trialEndsAt &&
    Number.isFinite(Date.parse(s.trialEndsAt)) && Date.parse(s.trialEndsAt) > now;
}
export function senderReadiness(input: {
  owner: string; channel: ManagedChannel; setupVersion: string;
  subscription: SubscriptionEvidence; assignment?: SenderEvidence | null;
  liveApproved: boolean; now?: number;
}): { state: SetupState; reason: string } {
  const now = input.now ?? Date.now(), a = input.assignment;
  if (!subscriptionMayUseMessaging(input.subscription, now))
    return { state: "action_required", reason: input.subscription.verified ? "An active subscription or unexpired verified trial is required." : "Your subscription could not be verified. Please retry." };
  if (!a) return { state: "pending_verification", reason: "MyARI has not yet assigned and verified your managed sender." };
  if (a.ownerId !== input.owner || a.channel !== input.channel)
    return { state: "action_required", reason: "Sender ownership could not be verified." };
  if (a.suspended || a.registration === "rejected")
    return { state: "action_required", reason: "Your sender needs a MyARI review before it can be used." };
  if (a.expiresAt && (!Number.isFinite(Date.parse(a.expiresAt)) || Date.parse(a.expiresAt) <= now))
    return { state: "action_required", reason: "Sender verification has expired." };
  if (!a.sender || a.setupVersion !== input.setupVersion || a.registration !== "approved" ||
      !a.providerVerified || !a.providerTermsApproved || !a.credentialScopeVerified ||
      !a.deliveryVerified || !a.quotaEnforcementVerified ||
      (input.channel === "sms" && !a.dedicated) || !a.inboundVerified)
    return { state: "pending_verification", reason: "Sender registration, reply routing, delivery evidence and spending safeguards must be verified first." };
  if (!input.liveApproved)
    return { state: "pending_verification", reason: "MyARI launch approval is pending. Saving setup details does not enable sending." };
  return { state: "ready", reason: "Your managed sender is verified. Every message still requires consent, available allowance and delivery authorization." };
}
/** Deterministic segment estimation; the worker must reserve these units atomically before submission. */
const GSM = new Set(Array.from("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"));
const EXTENDED = new Set(Array.from("^{}\\[~]|€\f"));
export function smsSegments(text: string) {
  if (!text) return 0;
  let units = 0;
  for (const c of text) {
    if (GSM.has(c)) units++;
    else if (EXTENDED.has(c)) units += 2;
    else return text.length <= 70 ? 1 : Math.ceil(text.length / 67);
  }
  return units <= 160 ? 1 : Math.ceil(units / 153);
}
export function canReserveTrialUnits(channel: ManagedChannel, used: number, reserved: number, requested: number) {
  if (![used, reserved, requested].every(Number.isSafeInteger) || used < 0 || reserved < 0 || requested <= 0) return false;
  const cap = channel === "sms" ? PROPOSED_TRIAL_ALLOWANCES.smsSegments : channel === "email" ? PROPOSED_TRIAL_ALLOWANCES.emails : PROPOSED_TRIAL_ALLOWANCES.voicemailDrops;
  return used + reserved + requested <= cap;
}
