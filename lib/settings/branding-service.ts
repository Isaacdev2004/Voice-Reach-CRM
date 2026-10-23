import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadSavedSettings } from "@/lib/billing/settings-store";
import { BrandKitSchema, emptyBrandKit, ownedBrandPath } from "./brand-kit";
export async function subscriberBranding(owner: string) {
  const settings = await loadSavedSettings(owner);
  const parsed = BrandKitSchema.safeParse(settings?.brandKit);
  const kit = parsed.success ? parsed.data : emptyBrandKit();
  const sign = async (path: string) => {
    if (!path || !ownedBrandPath(owner, path)) return "";
    const result = await supabaseAdmin.storage
      .from(process.env.BRAND_STORAGE_BUCKET || "brand-assets")
      .createSignedUrl(path, 3600);
    return result.data?.signedUrl ?? "";
  };
  const [headshotUrl, logoUrl] = await Promise.all([
    sign(kit.headshotPath),
    sign(kit.logoPath),
  ]);
  return {
    kit,
    headshotUrl:
      headshotUrl ||
      (kit.useProfilePhoto &&
      settings?.profile.avatarUrl?.startsWith("https://")
        ? settings.profile.avatarUrl
        : ""),
    logoUrl,
  };
}
