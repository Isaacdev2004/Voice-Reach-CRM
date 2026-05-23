import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/audit";

const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  scriptId: z.string().min(1).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const ownerId = await requireUserId();
  const { id } = await context.params;
  const body = PatchSchema.parse(await request.json());

  const updates: Record<string, string> = {};
  if (body.title) updates.title = body.title;
  if (body.scriptId) updates.script_id = body.scriptId;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("voice_assets")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "VOICE_ASSET_UPDATED",
    entityType: "voice_asset",
    entityId: id,
    metadata: updates,
  });

  return NextResponse.json({ voiceAsset: data });
}
