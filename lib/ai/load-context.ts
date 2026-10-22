import type { AiContext } from "./prompts";
import { AiGenerationError } from "./errors";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/** Read only the selected owner's contact; never trust client-supplied saved notes. */
export async function loadAiContext(ownerId: string, context: AiContext,
  database = supabaseAdmin,
): Promise<AiContext> {
  if (!context.contactId) return context;
  const { data, error } = await database.from("contacts")
    .select("first_name, last_name, notes")
    .eq("owner_id", ownerId).eq("id", context.contactId).maybeSingle();
  if (error) throw new AiGenerationError("unavailable", 503);
  if (!data) throw new AiGenerationError("contact_unavailable", 404);
  return { ...context,
    contactName: [data.first_name, data.last_name].filter(Boolean).join(" ").slice(0, 200),
    contactNotes: typeof data.notes === "string" ? data.notes.slice(0, 6000) : undefined,
  };
}
