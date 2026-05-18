import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writeAuditLog } from "@/lib/audit";

const BodySchema = z.object({ voiceAssetId: z.string().uuid() });

export async function POST(request: Request) {
  const ownerId = await requireUserId();
  const { voiceAssetId } = BodySchema.parse(await request.json());

  const { data, error } = await supabaseAdmin
    .from("voice_assets")
    .update({ approved: true })
    .eq("id", voiceAssetId)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await writeAuditLog({ ownerId, action: "VOICE_APPROVED", entityType: "voice_asset", entityId: voiceAssetId });
  return NextResponse.json({ voiceAsset: data });
}
