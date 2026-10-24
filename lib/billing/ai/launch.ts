import { z } from "zod";
import { AI_LAUNCH_PLANS } from "./catalog";
export const LaunchSchema = z
  .object({
    approved: z.boolean(),
    start: z.string().datetime(),
    end: z.string().datetime(),
    eligiblePlans: z.array(z.enum(["starter", "growth", "pro"])).min(1),
    eligibleOwnerIds: z.array(z.string().min(1)).default([]),
    allNewSubscribers: z.boolean().default(false),
    grandfatheringTerms: z.string().min(20).max(3000),
    postLaunchPrices: z
      .record(z.string(), z.number().positive())
      .nullable()
      .default(null),
    regularPricesApproved: z.boolean().default(false),
  })
  .strict()
  .refine(
    (x) =>
      Date.parse(x.end) > Date.parse(x.start) &&
      Date.parse(x.end) - Date.parse(x.start) === 90 * 86400000,
    "Launch window must be exactly 90 days",
  );
export function launchConfig() {
  try {
    return LaunchSchema.parse(
      JSON.parse(process.env.MYARI_AI_LAUNCH_CONFIG ?? "null"),
    );
  } catch {
    return null;
  }
}
export function launchEligibility(
  owner: string,
  hasExistingSubscription: boolean,
  now = new Date(),
) {
  const c = launchConfig();
  if (process.env.MYARI_AI_PRICING_ENABLED !== "true" || !c?.approved)
    return {
      eligible: false,
      reason: "AI launch pricing has not been approved/configured.",
    };
  if (hasExistingSubscription)
    return {
      eligible: false,
      reason:
        "Existing subscribers retain their plan; an informed migration requires a separately reviewed upgrade.",
    };
  if (+now < Date.parse(c.start) || +now >= Date.parse(c.end))
    return {
      eligible: false,
      reason: "The approved launch enrollment window is not active.",
    };
  if (!c.allNewSubscribers && !c.eligibleOwnerIds.includes(owner))
    return {
      eligible: false,
      reason: "This subscriber is not included in the approved launch cohort.",
    };
  return { eligible: true, config: c };
}
export function publicAiLaunch() {
  const c = launchConfig();
  return process.env.MYARI_AI_PUBLIC_LAUNCH_VERIFIED === "true" &&
    process.env.MYARI_AI_ENTITLEMENTS_ENABLED === "true" &&
    process.env.MYARI_AI_STRIPE_MODE === "live" &&
    process.env.MYARI_AI_BILLING_LIVE_APPROVED === "true" &&
    process.env.MYARI_AI_BILLING_ENABLED === "true" &&
    process.env.MYARI_AI_METER_DATABASE_VERIFIED === "true" &&
    process.env.MYARI_AI_PRICING_ENABLED === "true" &&
    c?.approved &&
    c.allNewSubscribers &&
    Date.now() >= Date.parse(c.start) &&
    Date.now() < Date.parse(c.end)
    ? {
        plans: AI_LAUNCH_PLANS.filter((p) => c.eligiblePlans.includes(p.id)),
        terms: c.grandfatheringTerms,
        start: c.start,
        end: c.end,
      }
    : null;
}
