import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { SaveSchema } from "@/lib/notes/workspace";
import { notesFailure, validateLinks } from "@/lib/notes/server";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  try {
    // Explicit projection makes an unapplied migration fail closed instead of pretending persistence works.
    const notes = await ownedRows(
      "contact_notes",
      "id, owner_id, contact_id, title, body, kind, created_at, updated_at, metadata, revision, client_key",
      owner,
    );
    const contacts = await ownedRows(
      "contacts",
      "id, first_name, last_name, email, phone, property_address, preferred_area, budget",
      owner,
    );
    return apiOk({ notes, contacts });
  } catch {
    return notesFailure();
  }
});
export const POST = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const parsed = SaveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return apiError("Check the note fields and try again.", { status: 400 });
  try {
    const b = parsed.data;
    if (!(await validateLinks(owner, b.metadata)))
      return apiError("A linked record is no longer available.", {
        status: 404,
      });
    const { data, error } = await supabaseAdmin.rpc("save_notes_workspace", {
      p_owner: owner,
      p_id: b.id,
      p_client_key: b.clientKey,
      p_expected: b.expectedRevision,
      p_title: b.title,
      p_body: b.body,
      p_kind: b.kind,
      p_metadata: b.metadata,
    });
    if (error) {
      if (error.message.includes("NOTE_CONFLICT"))
        return apiError(
          "A newer version exists. Review it before saving again.",
          { status: 409, code: "note_conflict" },
        );
      if (error.message.includes("NOTE_NOT_FOUND"))
        return apiError("Note not found.", { status: 404 });
      return notesFailure();
    }
    return apiOk({ note: data });
  } catch {
    return notesFailure();
  }
});
