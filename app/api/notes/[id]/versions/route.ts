import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedNote, notesFailure } from "@/lib/notes/server";
export const GET = withApiHandler<{ params: Promise<{ id: string }> }>(
  async (_r, c) => {
    const owner = await requireUserId(),
      { id } = await c.params;
    try {
      if (!(await ownedNote(owner, id)))
        return apiError("Note not found.", { status: 404 });
      const { data, error } = await supabaseAdmin
        .from("note_versions")
        .select("*")
        .eq("owner_id", owner)
        .eq("note_id", id)
        .order("revision", { ascending: false })
        .limit(50);
      return error ? notesFailure() : apiOk({ versions: data ?? [] });
    } catch {
      return notesFailure();
    }
  },
);
