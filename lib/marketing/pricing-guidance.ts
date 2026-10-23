import { PLAN_OPTIONS, type PlanId } from "@/lib/billing/plans";

/** Presentation only; billing amounts and entitlements remain in billing configuration. */
export function pricingHighlights(id: PlanId): string[] {
  const plan = PLAN_OPTIONS.find((p) => p.id === id)!;
  const indices =
    id === "starter"
      ? [2, 3, 4, 6]
      : id === "growth"
        ? [0, 2, 3, 5]
        : [0, 2, 3, 5, 4];
  return indices.map((index) => plan.features[index]);
}

export function recommendPlan(contacts: number, users: number, sms: number) {
  if (
    ![contacts, users, sms].every(Number.isInteger) ||
    contacts < 0 ||
    users < 1 ||
    sms < 0
  )
    return null;
  const candidates = PLAN_OPTIONS.filter(
    (p) =>
      !p.contactSales &&
      (p.contactLimit === null || contacts <= p.contactLimit) &&
      users <= p.usersIncluded,
  );
  // Choose the smallest plan covering entered monthly SMS volume without overages.
  const plan =
    candidates.find((p) => sms <= p.smsIncluded) ??
    PLAN_OPTIONS.find((p) => p.id === "team")!;
  const explanation = plan.contactSales
    ? "Your contact, team, or monthly SMS needs exceed a self-service plan's included limits. Contact us to discuss Team; custom allowances require a quote."
    : `${plan.name} covers ${contacts.toLocaleString()} contacts and ${users} ${users === 1 ? "user" : "users"}${sms ? `, with ${plan.smsIncluded.toLocaleString()} included SMS per month` : ""}. This recommendation uses contact limits, included users and SMS allowances; it does not predict results. Review voicemail and email needs in the comparison.`;
  return { plan, explanation };
}
