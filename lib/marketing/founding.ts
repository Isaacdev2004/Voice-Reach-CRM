/** Founding 100 launch offer - first 100 paying subscribers */
export const FOUNDING_100 = {
  name: "ARI Founding 100",
  seatsTotal: 100,
  trialDays: 14,
  headline: "Founding Realtor Program",
  promise: "Early access · Founding pricing · Direct founder feedback",
  /** Hard caps during free trial to control Twilio/Slybroadcast spend */
  trialUsageCaps: {
    sms: 25,
    rvm: 5,
    email: 50,
  },
  perks: [
    "14-day free trial - card on file, no charge until trial ends",
    "Founding-member pricing while seats last",
    "Priority feedback channel to the founding team",
    "White-glove setup is included on every plan - not Founding-exclusive",
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
