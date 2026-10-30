import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { apiError } from "@/lib/api-response";
import { isUuid } from "@/lib/contacts/is-uuid";
import type { NoteMetadata } from "./workspace";
export async function ownedNote(owner: string, id: string) {
  if (!isUuid(id)) return null;
  const { data, error } = await supabaseAdmin
    .from("contact_notes")
    .select("*")
    .eq("owner_id", owner)
    .eq("id", id)
    .maybeSingle();
  if (error) throw Error("NOTES_UNAVAILABLE");
  return data;
}
export async function validateLinks(owner: string, meta: NoteMetadata) {
  for (const id of new Set([...meta.contactIds, ...meta.propertyContactIds])) {
    const { data, error } = await supabaseAdmin
      .from("contacts")
      .select("id, property_address")
      .eq("owner_id", owner)
      .eq("id", id)
      .maybeSingle();
    if (error) throw Error("NOTES_UNAVAILABLE");
    if (
      !data ||
      (meta.propertyContactIds.includes(id) && !data.property_address)
    )
      return false;
  }
  for (const [table, ids] of [
    ["campaigns", meta.campaignIds],
    ["contact_tasks", meta.taskIds],
  ] as const) {
    for (const id of new Set(ids)) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select("id")
        .eq("owner_id", owner)
        .eq("id", id)
        .maybeSingle();
      if (error) throw Error("NOTES_UNAVAILABLE");
      if (!data) return false;
    }
  }
  return true;
}
export function notesFailure() {
  return apiError(
    "Notes are temporarily unavailable. Your draft has not been discarded. Please try again.",
    { status: 503 },
  );
}
