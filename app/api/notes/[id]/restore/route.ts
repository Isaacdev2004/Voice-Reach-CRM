import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedNote, validateLinks, notesFailure } from "@/lib/notes/server";
import { MetadataSchema } from "@/lib/notes/workspace";
import { writeAuditLog } from "@/lib/audit";
import { z } from "zod";
const Schema = z
  .object({
    versionId: z.string().uuid(),
    expectedRevision: z.number().int().positive(),
    confirmation: z.literal("RESTORE_NOTE"),
  })
  .strict();
export const POST = withApiHandler<{ params: Promise<{ id: string }> }>(
  async (request, context) => {
    const owner = await requireUserId(),
      { id } = await context.params,
      b = Schema.safeParse(await request.json().catch(() => null));
    if (!b.success)
      return apiError("Review and confirm the version to restore.", {
        status: 400,
      });
    try {
      const current = await ownedNote(owner, id);
      if (!current) return apiError("Note not found.", { status: 404 });
      const version = await supabaseAdmin
        .from("note_versions")
        .select("*")
        .eq("owner_id", owner)
        .eq("note_id", id)
        .eq("id", b.data.versionId)
        .maybeSingle();
      if (version.error) return notesFailure();
      if (!version.data) return apiError("Version not found.", { status: 404 });
      const v = version.data,
        metadata = MetadataSchema.parse(v.metadata);
      if (v.contact_id && !metadata.contactIds.includes(v.contact_id))
        metadata.contactIds.unshift(v.contact_id);
      if (!(await validateLinks(owner, metadata)))
        return apiError(
          "A historical linked record is no longer available. Copy this version into a new note and review its links instead.",
          { status: 409 },
        );
      const result = await supabaseAdmin.rpc("save_notes_workspace", {
        p_owner: owner,
        p_id: id,
        p_client_key: current.client_key,
        p_expected: b.data.expectedRevision,
        p_title: v.title,
        p_body: v.body,
        p_kind: v.kind,
        p_metadata: metadata,
      });
      if (result.error)
        return result.error.message.includes("NOTE_CONFLICT")
          ? apiError("The current note changed. Refresh before restoring.", {
              status: 409,
            })
          : notesFailure();
      await writeAuditLog({
        ownerId: owner,
        action: "NOTE_VERSION_RESTORED",
        entityType: "contact_note",
        entityId: id,
        metadata: { versionId: b.data.versionId },
      }).catch(() => undefined);
      return apiOk({ note: result.data });
    } catch {
      return notesFailure();
    }
  },
);
