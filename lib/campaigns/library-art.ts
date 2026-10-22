import type { LibraryCampaign } from "./library-data";
/** Preserve assignments across reloads; never reuse a cover within the same library. */
export function allocateCampaignArt(
  keys: string[],
  previous: Record<string, number>,
  capacity = 24,
) {
  const ordered = [...new Set(keys)].sort(),
    next: Record<string, number> = {},
    used = new Set<number>();
  for (const key of ordered) {
    const value = previous[key];
    if (
      Number.isInteger(value) &&
      value >= 0 &&
      value < capacity &&
      !used.has(value)
    ) {
      next[key] = value;
      used.add(value);
    }
  }
  for (const key of ordered) {
    if (key in next) continue;
    const value = Array.from({ length: capacity }, (_, i) => i).find(
      (i) => !used.has(i),
    );
    if (value !== undefined) {
      next[key] = value;
      used.add(value);
    }
  }
  return next;
}
export function campaignCover(
  c: LibraryCampaign,
  art: Record<string, number>,
): { url: string; tile?: number } {
  const uploaded = c.cover_image_url || c.image_url;
  if (typeof uploaded === "string" && /^(https?:\/\/|\/)/.test(uploaded))
    return { url: uploaded };
  const slot = art[c.id];
  if (!Number.isInteger(slot) || slot < 0 || slot >= 24) return { url: "" };
  return {
    url:
      slot < 12
        ? "/brand/campaigns/interiors-a.png"
        : "/brand/campaigns/interiors-b.png",
    tile: slot % 12,
  };
}
