import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PERSONAL_TYPE = "Personal Tasks";

export async function getOrCreatePersonalContact(ownerId: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from("contacts")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("type", PERSONAL_TYPE)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data: created, error } = await supabaseAdmin
    .from("contacts")
    .insert({
      owner_id: ownerId,
      first_name: "My",
      last_name: "Tasks",
      phone: "+10000000000",
      type: PERSONAL_TYPE,
      source: "VoiceReach",
      notes: "Auto-created for personal tasks and reminders without a linked contact.",
    })
    .select("id")
    .single();

  if (error || !created) throw new Error(error?.message ?? "Could not create personal task contact");
  return created.id;
}
