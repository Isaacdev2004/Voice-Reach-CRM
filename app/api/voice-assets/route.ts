import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const expected = request.headers.get("X-MyARI-Owner");
  if (expected && expected !== ownerId)
    return apiError("Your account changed. Reload the recording library.", {
      status: 409,
    });
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "voice-assets";

  let data: Record<string, unknown>[];
  try {
    data = await ownedRows<Record<string, unknown>>(
      "voice_assets",
      "*",
      ownerId,
    );
  } catch {
    return apiError("Recordings could not be loaded. Please retry.", {
      status: 503,
    });
  }
  data.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const assets = await Promise.all(
    data.map(async (asset) => {
      if (
        typeof asset.storage_path !== "string" ||
        !asset.storage_path.startsWith(`${ownerId}/`)
      )
        return { ...asset, playbackUrl: null };
      const { data: signed } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(asset.storage_path, 60 * 60);
      return { ...asset, playbackUrl: signed?.signedUrl ?? null };
    }),
  );

  return apiOk({ voiceAssets: assets });
});
