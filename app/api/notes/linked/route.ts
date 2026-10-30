import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedRows } from "@/lib/delivery/owned-rows";
import {
  metadataOf,
  relatedContactIds,
  type WorkspaceNote,
} from "@/lib/notes/workspace";
import { notesFailure } from "@/lib/notes/server";
import { z } from "zod";
export const GET = withApiHandler(async (request) => {
  const owner = await requireUserId(),
    url = new URL(request.url);
  const type = url.searchParams.get("type"),
    id = url.searchParams.get("id");
  if (
    !z.string().uuid().safeParse(id).success ||
    !["contact", "property", "campaign", "task"].includes(type ?? "")
  )
    return apiError("Choose a valid linked record.", { status: 400 });
  try {
    const table =
      type === "campaign"
        ? "campaigns"
        : type === "task"
          ? "contact_tasks"
          : "contacts";
    const record = await supabaseAdmin
      .from(table)
      .select(type === "property" ? "id,property_address" : "id")
      .eq("owner_id", owner)
      .eq("id", id!)
      .maybeSingle();
    if (record.error) return notesFailure();
    if (
      !record.data ||
      (type === "property" &&
        !(record.data as unknown as { property_address?: string })
          .property_address)
    )
      return apiError("Record not found.", { status: 404 });
    const rows = await ownedRows<WorkspaceNote>("contact_notes", "*", owner);
    return apiOk({
      notes: rows
        .filter((note) => {
          const m = metadataOf(note);
          return type === "contact"
            ? relatedContactIds(note).includes(id!)
            : type === "property"
              ? m.propertyContactIds.includes(id!) || note.contact_id === id
              : type === "campaign"
                ? m.campaignIds.includes(id!)
                : m.taskIds.includes(id!);
        })
        .map((note) => ({
          id: note.id,
          title: note.title,
          updated_at: note.updated_at,
        })),
    });
  } catch {
    return notesFailure();
  }
});
