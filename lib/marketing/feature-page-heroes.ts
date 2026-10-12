import { HERO_IMAGES, type HeroImage } from "@/lib/marketing/hero-images";
import type { FeaturePageSlug } from "@/lib/seo/feature-pages";

/** Distinct public-site mockup per feature page (see `HERO_IMAGES` — not dashboard JPGs). */
const FEATURE_PAGE_HERO: Record<FeaturePageSlug, HeroImage> = {
  "lead-management": HERO_IMAGES.crmDashboard,
  "pipeline-management": HERO_IMAGES.homeDashboard,
  "automated-follow-up": HERO_IMAGES.followUpWorkflow,
  "campaign-builder": HERO_IMAGES.campaignBuilder,
  "text-automation": HERO_IMAGES.campaignLibrary,
  "email-automation": HERO_IMAGES.leadReactivation,
  "client-email-updates": HERO_IMAGES.leadReactivationDetail,
  "lead-reactivation": HERO_IMAGES.leadReactivation,
  "ringless-voicemail": HERO_IMAGES.workspaceOverview,
  "voice-studio": HERO_IMAGES.voiceScripts,
  "calendar-and-tasks": HERO_IMAGES.homeDashboard,
  "notes-and-strategy": HERO_IMAGES.leadReactivationDetail,
  "mortgage-calculator": HERO_IMAGES.workspaceOverview,
  "property-finder": HERO_IMAGES.campaignLibrary,
  analytics: HERO_IMAGES.leadReactivation,
  notifications: HERO_IMAGES.followUpWorkflow,
  "google-calendar": HERO_IMAGES.crmDashboard,
  "ai-assistant": HERO_IMAGES.workspaceOverview,
  "automation-workflows": HERO_IMAGES.campaignBuilder,
  "dotloop-integration": HERO_IMAGES.crmDashboard,
};

export function heroImageForFeaturePage(slug: FeaturePageSlug): HeroImage {
  return FEATURE_PAGE_HERO[slug] ?? HERO_IMAGES.default;
}
