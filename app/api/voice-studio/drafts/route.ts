import { z } from "zod";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
const schema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  script: z.string().max(5000),
  category: z.string().max(80).default("General"),
  archived: z.boolean().default(false),
});
export const GET = withApiHandler(async () => {
  const owner = await requireUserId();
  const { data, error } = await supabaseAdmin
    .from("voice_script_drafts")
    .select("*")
    .eq("owner_id", owner)
    .order("updated_at", { ascending: false });
  if (error)
    return apiError(
      "Script drafts are unavailable. Your administrator may need to apply the Voice Studio database migration.",
      { status: 503 },
    );
  return apiOk({ drafts: data ?? [] });
});
export const PUT = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const body = schema.parse(await request.json());
  // Never use an unscoped upsert: a conflicting foreign UUID must not transfer ownership.
  const existing = await supabaseAdmin
    .from("voice_script_drafts")
    .select("id")
    .eq("owner_id", owner)
    .eq("id", body.id)
    .maybeSingle();
  if (existing.error)
    return apiError("Could not save the script. Please retry.", {
      status: 503,
    });
  const row = {
    ...body,
    owner_id: owner,
    updated_at: new Date().toISOString(),
  };
  const result = existing.data
    ? await supabaseAdmin
        .from("voice_script_drafts")
        .update(row)
        .eq("id", body.id)
        .eq("owner_id", owner)
        .select("*")
        .single()
    : await supabaseAdmin
        .from("voice_script_drafts")
        .insert(row)
        .select("*")
        .single();
  if (result.error)
    return apiError(
      "Could not save the script. Your draft remains in this workspace.",
      { status: 409 },
    );
  return apiOk({ draft: result.data });
});
