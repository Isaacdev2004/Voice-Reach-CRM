import { HERO_IMAGES, type HeroImage } from "@/lib/marketing/hero-images";
import type { FeaturePageSlug } from "@/lib/seo/feature-pages";

const FEATURE_PAGE_HERO: Partial<Record<FeaturePageSlug, HeroImage>> = {
  "lead-management": HERO_IMAGES.contacts,
  "pipeline-management": HERO_IMAGES.dashboard,
  "automated-follow-up": HERO_IMAGES.campaigns,
  "campaign-builder": HERO_IMAGES.campaigns,
  "text-automation": HERO_IMAGES.campaigns,
  "email-automation": HERO_IMAGES.campaigns,
  "client-email-updates": HERO_IMAGES.campaigns,
  "lead-reactivation": HERO_IMAGES.campaigns,
  "ringless-voicemail": HERO_IMAGES.voiceScripts,
  "voice-studio": HERO_IMAGES.voiceScripts,
  "calendar-and-tasks": HERO_IMAGES.calendar,
  "notes-and-strategy": HERO_IMAGES.notes,
  "mortgage-calculator": HERO_IMAGES.mortgage,
  "property-finder": HERO_IMAGES.mortgage,
  analytics: HERO_IMAGES.analytics,
  notifications: HERO_IMAGES.tasks,
  "google-calendar": HERO_IMAGES.calendar,
  "ai-assistant": HERO_IMAGES.dashboard,
  "automation-workflows": HERO_IMAGES.campaigns,
  "dotloop-integration": HERO_IMAGES.dashboard,
};

export function heroImageForFeaturePage(slug: FeaturePageSlug): HeroImage {
  return FEATURE_PAGE_HERO[slug] ?? HERO_IMAGES.default;
}
