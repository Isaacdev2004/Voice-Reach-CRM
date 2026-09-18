/** Founding 100 launch offer — first 100 paying subscribers */
export const FOUNDING_100 = {
  name: "ARI Founding 100",
  seatsTotal: 100,
  trialDays: 14,
  headline: "Founding Realtor Program",
  promise: "Early access · White-glove setup · Founding pricing · Direct founder feedback",
  perks: [
    "14-day free trial — no charge until trial ends",
    "We import your leads and configure your first campaign",
    "Locked-in founding rate for your first 3 months",
    "Direct line to the team while we build with you",
  ],
  positioning: "The CRM that actually follows up.",
  tagline:
    "Your leads don't need another database. They need follow-up that turns dormant contacts into conversations.",
} as const;

export function trialDaysFromEnv() {
  const raw = process.env.STRIPE_TRIAL_DAYS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : FOUNDING_100.trialDays;
  return Number.isFinite(n) && n > 0 ? n : FOUNDING_100.trialDays;
}
