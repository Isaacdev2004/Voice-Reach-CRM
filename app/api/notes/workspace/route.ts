import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { SaveSchema } from "@/lib/notes/workspace";
import {
  notesMode,
  normalizeNote,
  canSaveBasic,
} from "@/lib/notes/compatibility";
import type { NoteRow } from "@/lib/notes/types";
import { notesFailure, validateLinks } from "@/lib/notes/server";
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  try {
    const mode = await notesMode(owner);
    const notes = await ownedRows<NoteRow>("contact_notes", "*", owner);
    const contacts = await ownedRows<
      import("@/lib/notes/workspace").NoteContact
    >("contacts", "*", owner);
    return apiOk({
      notes: notes.map((n) =>
        normalizeNote(
          n,
          mode === "basic" &&
            !!contacts.find((c) => c.id === n.contact_id)?.property_address,
        ),
      ),
      contacts: contacts.map((c) => ({
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        email: c.email,
        phone: c.phone,
        property_address: c.property_address,
        preferred_area: c.preferred_area,
        budget: c.budget,
      })),
      mode,
    });
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
    const mode = await notesMode(owner);
    if (mode === "read-only")
      return apiError(
        "Editing is temporarily unavailable. Your draft is preserved.",
        { status: 503 },
      );
    if (mode === "basic") {
      if (!canSaveBasic(b.metadata, b.kind))
        return apiError(
          "This note uses features that are not available yet. Your draft is preserved.",
          { status: 409, code: "upgrade_required" },
        );
      // Existing schema: stable primary key for creation retries, timestamp compare-and-swap for edits.
      if (!(await validateLinks(owner, b.metadata)))
        return apiError("A linked contact is unavailable.", { status: 404 });
      const primary = b.metadata.contactIds[0]
        ? await supabaseAdmin
            .from("contacts")
            .select("id, property_address")
            .eq("owner_id", owner)
            .eq("id", b.metadata.contactIds[0])
            .maybeSingle()
        : { data: null, error: null };
      if (primary.error) return notesFailure();
      const toBasic = (row: NoteRow) =>
        normalizeNote(row, !!primary.data?.property_address);
      const id = b.id ?? b.clientKey;
      const current = await supabaseAdmin
        .from("contact_notes")
        .select("*")
        .eq("owner_id", owner)
        .eq("id", id)
        .maybeSingle();
      if (current.error) return notesFailure();
      const payload = {
        title: b.title,
        body: b.body,
        kind: b.kind,
        contact_id: b.metadata.contactIds[0] ?? null,
      };
      if (current.data) {
        const same = Object.entries(payload).every(
          ([key, value]) => current.data[key] === value,
        );
        if (same) return apiOk({ note: toBasic(current.data), mode });
        if (
          !b.id ||
          !b.expectedUpdatedAt ||
          current.data.updated_at !== b.expectedUpdatedAt
        )
          return apiError(
            "A newer version exists. Review it before saving again.",
            { status: 409, code: "note_conflict" },
          );
        const updated = await supabaseAdmin
          .from("contact_notes")
          .update({
            ...payload,
            updated_at: new Date(
              Math.max(Date.now(), Date.parse(b.expectedUpdatedAt) + 1),
            ).toISOString(),
          })
          .eq("owner_id", owner)
          .eq("id", id)
          .eq("updated_at", b.expectedUpdatedAt)
          .select("*")
          .maybeSingle();
        if (updated.error) return notesFailure();
        if (!updated.data)
          return apiError(
            "A newer version exists. Review it before saving again.",
            { status: 409, code: "note_conflict" },
          );
        return apiOk({ note: toBasic(updated.data), mode });
      }
      if (b.id) return apiError("Note not found.", { status: 404 });
      const inserted = await supabaseAdmin
        .from("contact_notes")
        .insert({
          id,
          owner_id: owner,
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (inserted.error) {
        if (inserted.error.code === "23505") {
          const retry = await supabaseAdmin
            .from("contact_notes")
            .select("*")
            .eq("owner_id", owner)
            .eq("id", id)
            .maybeSingle();
          if (
            !retry.error &&
            retry.data &&
            Object.entries(payload).every(
              ([key, value]) => retry.data[key] === value,
            )
          )
            return apiOk({ note: toBasic(retry.data), mode });
          return apiError(
            "This draft could not be saved. Retry as a new note.",
            { status: 409, code: "note_conflict" },
          );
        }
        return notesFailure();
      }
      return apiOk({ note: toBasic(inserted.data), mode });
    }
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
