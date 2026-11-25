import { loadCase } from "./store";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assistantAccess } from "@/lib/assistant/config";
import { loadSavedSettings } from "@/lib/billing/settings-store";
export async function caseFacts(owner: string) {
  const [imports, campaigns, settings, assistant, record] = await Promise.all([
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
    loadCase(owner),
  ]);
  if (imports.error || campaigns.error) throw Error("readiness_unavailable");
  const connection = record?.milestones.connectionReview;
  const fresh = !!connection && Date.now() - Date.parse(connection.checkedAt) >= 0 && Date.now() - Date.parse(connection.checkedAt) < 86400000;
  return {
    facts: {
      imported: imports.data.some((x) => Number(x.result?.imported) > 0),
      campaignDraft: campaigns.data.some(c => c.id === record?.milestones.preparedCampaignId),
      integrationsVerified: fresh && connection?.calendar === true && (record?.discovery.channels ?? []).every(channel => channel === "sms" && connection?.sms === true),
    },
    campaigns: campaigns.data,
    subscription: {
      plan: settings?.billing.planName ?? "Unverified",
      status: settings?.billing.subscriptionStatus ?? "unverified",
    },
    assistantEnabled: assistant,
  };
}
