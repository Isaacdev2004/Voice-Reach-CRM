import type { FeaturePageSlug } from "./feature-pages";

/** Per-feature dashboard crop until dedicated screenshots are available. */
export const FEATURE_HERO_FOCUS: Partial<Record<FeaturePageSlug, string>> = {
  "lead-management": "object-[center_12%]",
  "pipeline-management": "object-[center_18%]",
  "campaign-builder": "object-[center_22%]",
  "text-automation": "object-[center_15%]",
  analytics: "object-[center_28%]",
  notifications: "object-[center_20%]",
  "calendar-and-tasks": "object-[center_24%]",
  "voice-studio": "object-[center_16%]",
  "ringless-voicemail": "object-[center_14%]",
};

export function featureHeroImageClass(slug: FeaturePageSlug) {
  return FEATURE_HERO_FOCUS[slug] ?? "object-top";
}
