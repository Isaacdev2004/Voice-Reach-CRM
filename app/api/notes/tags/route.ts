import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/audit";
import { notesFailure } from "@/lib/notes/server";
import { z } from "zod";
const Schema = z
  .object({
    action: z.enum(["create", "rename", "delete"]),
    id: z.string().uuid().optional(),
    name: z.string().trim().max(40).default(""),
    expectedName: z.string().max(40).optional(),
    confirmed: z.literal(true),
  })
  .strict();
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  const { data, error } = await supabaseAdmin
    .from("note_tags")
    .select("id,name,tag_key")
    .eq("owner_id", owner)
    .order("name");
  return error ? notesFailure() : apiOk({ tags: data ?? [] });
});
export const POST = withApiHandler(async (request) => {
  const owner = await requireUserId(),
    parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return apiError("Review the tag change before saving.", { status: 400 });
  const b = parsed.data;
  if (
    (b.action !== "delete" && !b.name.trim()) ||
    (b.action !== "create" && (!b.id || !b.expectedName))
  )
    return apiError("Choose a tag and review its current name.", {
      status: 400,
    });
  const { data, error } = await supabaseAdmin.rpc("manage_note_tag", {
    p_owner: owner,
    p_action: b.action,
    p_id: b.id ?? null,
    p_name: b.name,
    p_expected: b.expectedName ?? null,
  });
  if (error) {
    if (error.message.includes("NOTE_NOT_FOUND"))
      return apiError("Tag not found.", { status: 404 });
    if (/NOTE_CONFLICT|NOTE_TAG_EXISTS/.test(error.message))
      return apiError(
        "The tag changed or that name already exists. Refresh before retrying.",
        { status: 409 },
      );
    return notesFailure();
  }
  await writeAuditLog({
    ownerId: owner,
    action: "NOTE_TAG_CHANGED",
    entityType: "note_tag",
    entityId: b.id ?? data?.id,
    metadata: { action: b.action },
  }).catch(() => undefined);
  return apiOk({ tag: data });
});
