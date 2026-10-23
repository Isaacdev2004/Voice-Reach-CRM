import { getStripe, isStripeConfigured } from "@/lib/stripe/config";
import {supabaseAdmin} from "@/lib/supabaseAdmin";
/** Read only. Does not alter entitlements, create charges or change subscriptions. */
export async function readSubscriptionStatus(owner: string): Promise<{
  verified: boolean;
  status: "active" | "trialing" | "canceled" | "none";
  checkedAt?: string;
}> {
  if (!isStripeConfigured()) return { verified: false, status: "none" };
  try {
    const mapped=await supabaseAdmin.from("audit_logs").select("metadata").eq("owner_id",owner).eq("entity_type","billing").eq("action","STRIPE_CUSTOMER").order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(mapped.error)return {verified:false,status:"none"};
    const customerId=typeof mapped.data?.metadata?.customerId==="string"?mapped.data.metadata.customerId:null;
    if (!customerId)
      return {
        verified: true,
        status: "none",
        checkedAt: new Date().toISOString(),
      };
    const stripe = getStripe(),
      customer = await stripe.customers.retrieve(
        customerId,
        {},
        { timeout: 5000, maxNetworkRetries: 0 },
      );
    if (customer.deleted || customer.metadata.ownerId !== owner)
      return { verified: false, status: "none" };
    const subscriptions = await stripe.subscriptions.list(
      { customer: customerId, status: "all", limit: 100 },
      { timeout: 5000, maxNetworkRetries: 0 },
    );
    if (subscriptions.has_more) return { verified: false, status: "none" };
    const active = subscriptions.data.find(
      (s) => s.status === "active" || s.status === "trialing",
    );
    if (!active && subscriptions.data.some((s) => s.status !== "canceled"))
      return { verified: false, status: "none" };
    return {
      verified: true,
      status: active
        ? (active.status as "active" | "trialing")
        : subscriptions.data.length
          ? "canceled"
          : "none",
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return { verified: false, status: "none" };
  }
}
