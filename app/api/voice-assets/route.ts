import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const ownerId = await requireUserId();
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";

  const { data, error } = await supabaseAdmin
    .from("voice_assets")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const assets = await Promise.all(
    (data ?? []).map(async (asset) => {
      const { data: signed } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(asset.storage_path, 60 * 60);
      return {
        ...asset,
        playbackUrl: signed?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ voiceAssets: assets });
}
