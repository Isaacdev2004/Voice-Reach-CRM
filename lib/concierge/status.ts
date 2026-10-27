import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assistantAccess } from "@/lib/assistant/config";
import { loadSavedSettings } from "@/lib/billing/settings-store";
export async function caseFacts(owner: string) {
  const [imports, campaigns, settings, assistant] = await Promise.all([
    supabaseAdmin
      .from("concierge_imports")
      .select("id,state,result")
      .eq("owner_id", owner)
      .eq("state", "completed")
      .limit(20),
    supabaseAdmin
      .from("campaigns")
      .select("id,name,status")
      .eq("owner_id", owner)
      .eq("status", "draft")
      .limit(20),
    loadSavedSettings(owner),
    assistantAccess(owner),
  ]);
  if (imports.error || campaigns.error) throw Error("readiness_unavailable");
  return {
    facts: {
      imported: imports.data.some((x) => Number(x.result?.imported) > 0),
      campaignDraft: campaigns.data.length > 0,
      integrationsVerified: false,
    },
    campaigns: campaigns.data,
    subscription: {
      plan: settings?.billing.planName ?? "Unverified",
      status: settings?.billing.subscriptionStatus ?? "unverified",
    },
    assistantEnabled: assistant,
  };
}
