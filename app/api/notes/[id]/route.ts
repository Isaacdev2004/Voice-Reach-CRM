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
  expectedRevision: z.number().int().positive().optional(),
});

export const PATCH = withApiHandler<RouteContext>(async (request, context) => {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  if (!isUuid(id)) return apiError("Invalid id", { status: 400 });

  const parsed = PatchNoteSchema.parse(await request.json());
  const current = await supabaseAdmin
    .from("contact_notes")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("id", id)
    .maybeSingle();
  if (current.error) return apiError("Unable to load note.", { status: 503 });
  if (!current.data) return apiError("Note not found", { status: 404 });
  const revision = parsed.expectedRevision ?? current.data.revision;
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (parsed.body !== undefined) {
    updates.body = parsed.body;
    updates.title = titleFromFreeform(parsed.body, parsed.title);
  } else if (parsed.title !== undefined) {
    updates.title = parsed.title.trim() || "Untitled";
  }

  if (parsed.kind !== undefined) updates.kind = parsed.kind;
  if (parsed.contactId) {
    const { data: contact, error } = await supabaseAdmin
      .from("contacts")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("id", parsed.contactId)
      .maybeSingle();
    if (error)
      return apiError("Unable to verify contact. Please retry.", {
        status: 503,
      });
    if (!contact) return apiError("Contact not found", { status: 404 });
  }
  if (parsed.contactId !== undefined) {
    updates.contact_id = parsed.contactId;
    if (current.data.metadata !== undefined)
      updates.metadata = {
        ...current.data.metadata,
        contactIds: parsed.contactId ? [parsed.contactId] : [],
      };
  }

  let mutation = supabaseAdmin
    .from("contact_notes")
    .update(updates)
    .eq("owner_id", ownerId)
    .eq("id", id);
  if (revision !== undefined) mutation = mutation.eq("revision", revision);
  else if (current.data.updated_at)
    mutation = mutation.eq("updated_at", current.data.updated_at);
  else
    return apiError(
      "Reload this note before editing. Your draft is preserved.",
      { status: 409 },
    );
  const { data, error } = await mutation
    .select("*, contacts(id, first_name, last_name)")
    .maybeSingle();

  if (error)
    return apiError("Unable to update note. Please retry.", { status: 503 });
  if (!data)
    return apiError("A newer note version exists. Reload before editing.", {
      status: 409,
    });

  await writeAuditLog({
    ownerId,
    action: "NOTE_UPDATED",
    entityType: "contact_note",
    entityId: id,
  });

  return apiOk({ note: data });
});

export const DELETE = withApiHandler<RouteContext>(
  async (_request, context) => {
    const ownerId = await requireUserId();
    const { id } = await context.params;
    if (!isUuid(id)) return apiError("Invalid id", { status: 400 });

    const { data: deleted, error } = await supabaseAdmin
      .from("contact_notes")
      .delete()
      .eq("owner_id", ownerId)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error)
      return apiError("Unable to update note. Please retry.", { status: 503 });

    if (!deleted) return apiError("Note not found.", { status: 404 });
    await writeAuditLog({
      ownerId,
      action: "NOTE_DELETED",
      entityType: "contact_note",
      entityId: id,
    }).catch(() => undefined);

    return apiOk({ deleted: true });
  },
);
