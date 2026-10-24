import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AssistantFailure } from "./store";
import { BrandKitSchema, ownedBrandPath } from "@/lib/settings/brand-kit";
export async function savedSettings(owner: string) {
  const r = await supabaseAdmin
    .from("audit_logs")
    .select("metadata")
    .eq("owner_id", owner)
    .eq("entity_type", "user_settings")
    .eq("action", "SETTINGS_SAVED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (r.error)
    throw new AssistantFailure("Settings could not be verified", 503);
  return r.data?.metadata?.settings ?? null;
}
export async function ownedContact(owner: string, id: string) {
  const r = await supabaseAdmin
    .from("contacts")
    .select(
      "id,first_name,last_name,phone,email,notes,type,budget,preferred_area,property_address,dnc,opt_out_requested",
    )
    .eq("owner_id", owner)
    .eq("id", id)
    .maybeSingle();
  if (r.error) throw new AssistantFailure("Contact lookup is unavailable", 503);
  if (!r.data) throw new AssistantFailure("Contact not found", 404);
  return r.data;
}
export async function rows(
  owner: string,
  table: string,
  columns: string,
  filters: Record<string, string> = {},
) {
  let q = supabaseAdmin
    .from(table)
    .select(columns)
    .eq("owner_id", owner)
    .order("id", { ascending: true })
    .limit(51);
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const r = await q;
  if (r.error)
    throw new AssistantFailure("Requested CRM records are unavailable", 503);
  return {
    records: ((r.data ?? []) as unknown as Record<string, unknown>[]).slice(
      0,
      50,
    ),
    limited: (r.data ?? []).length > 50,
  };
}
export async function brandKit(owner: string) {
  const s = await savedSettings(owner),
    kit = BrandKitSchema.parse(s?.brandKit ?? {});
  if (!kit.approved)
    throw new AssistantFailure(
      "Approve your Brand Kit in Settings before using branded production tools",
      409,
    );
  if (
    !ownedBrandPath(owner, kit.logoPath) ||
    !ownedBrandPath(owner, kit.headshotPath)
  )
    throw new AssistantFailure("Brand assets could not be authorized", 403);
  return kit;
}
export async function searchContacts(owner: string, query: string) {
  let q = supabaseAdmin
    .from("contacts")
    .select("id,first_name,last_name,type")
    .eq("owner_id", owner);
  if (query) q = q.or(`first_name.ilike.*${query}*,last_name.ilike.*${query}*`);
  const r = await q
    .order("first_name", { ascending: true })
    .order("id", { ascending: true })
    .limit(21);
  if (r.error) throw new AssistantFailure("Contact search is unavailable", 503);
  return {
    records: (r.data ?? []).slice(0, 20),
    limited: (r.data ?? []).length > 20,
    source: "/dashboard/contacts",
  };
}
