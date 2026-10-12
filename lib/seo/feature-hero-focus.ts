import type { FeaturePageSlug } from "./feature-pages";

/** Optional crop tweak per feature when the banner is letterboxed in the grid. */
export const FEATURE_HERO_FOCUS: Partial<Record<FeaturePageSlug, string>> = {
  "campaign-builder": "22% center",
  "text-automation": "22% center",
  "automated-follow-up": "22% center",
  "lead-reactivation": "22% center",
};

export function featureHeroObjectPosition(slug: FeaturePageSlug): string | undefined {
  return FEATURE_HERO_FOCUS[slug];
}
