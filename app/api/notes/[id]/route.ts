import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { titleFromFreeform } from "@/lib/notes/freeform";
import { isUuid } from "@/lib/contacts/is-uuid";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

type RouteContext = { params: Promise<{ id: string }> };

const PatchNoteSchema = z.object({
  title: z.string().max(200).optional(),
  body: z.string().max(8000).optional(),
  kind: z.enum(["note", "strategy", "goal"]).optional(),
  contactId: z.string().uuid().optional().nullable(),
});

export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  if (!isUuid(id)) return apiError("Invalid id", { status: 400 });

  const parsed = PatchNoteSchema.parse(await request.json());
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (parsed.body !== undefined) {
    updates.body = parsed.body;
    updates.title = titleFromFreeform(parsed.body, parsed.title);
  } else if (parsed.title !== undefined) {
    updates.title = parsed.title.trim() || "Untitled";
  }

  if (parsed.kind !== undefined) updates.kind = parsed.kind;
  if (parsed.contactId !== undefined) updates.contact_id = parsed.contactId;

  const { data, error } = await supabaseAdmin
    .from("contact_notes")
    .update(updates)
    .eq("owner_id", ownerId)
    .eq("id", id)
    .select("*, contacts(id, first_name, last_name)")
    .maybeSingle();

  if (error) return apiError(error.message, { status: 500 });
  if (!data) return apiError("Note not found", { status: 404 });

  await writeAuditLog({
    ownerId,
    action: "NOTE_UPDATED",
    entityType: "contact_note",
    entityId: id,
  });

  return apiOk({ note: data });
});

export const DELETE = withApiHandler<RouteContext>(async (_request, context) => {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  if (!isUuid(id)) return apiError("Invalid id", { status: 400 });

  const { error } = await supabaseAdmin
    .from("contact_notes")
    .delete()
    .eq("owner_id", ownerId)
    .eq("id", id);

  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "NOTE_DELETED",
    entityType: "contact_note",
    entityId: id,
  });

  return apiOk({ deleted: true });
});
