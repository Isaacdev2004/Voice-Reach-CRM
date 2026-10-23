import { supabaseAdmin } from "@/lib/supabaseAdmin";
export async function ownsPartner(owner: string, id: string) {
  const r = await supabaseAdmin
    .from("partner_workspaces")
    .select("id")
    .eq("owner_id", owner)
    .eq("id", id)
    .maybeSingle();
  if (r.error) throw Error("Partner lookup unavailable");
  return !!r.data;
}
export async function ownsSharedAsset(owner: string, type: string, id: string) {
  const tables: Record<string, string> = {
    campaign: "campaigns",
    voice_asset: "voice_assets",
    note: "contact_notes",
  };
  const table = tables[type];
  if (!table) return false; // No verified list/script sharing model: fail closed.
  const r = await supabaseAdmin
    .from(table)
    .select("id")
    .eq("owner_id", owner)
    .eq("id", id)
    .maybeSingle();
  if (r.error) throw Error("Asset lookup unavailable");
  return !!r.data;
}
