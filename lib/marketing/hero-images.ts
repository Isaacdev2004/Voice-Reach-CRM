/** Public product imagery, captured from implemented UI with synthetic records. */
export type HeroImageVariant = "capture";
export type HeroImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  variant: HeroImageVariant;
  objectPosition?: string;
};
import { PRODUCT_CAPTURES as captures } from "./product-captures";
export const HERO_IMAGES = {
  homeDashboard: captures.dashboard,
  campaignLibrary: captures.campaigns,
  campaignBuilder: captures.builder,
  voiceScripts: captures.voice,
  crmDashboard: captures.contacts,
  followUpWorkflow: captures.sequence,
  leadReactivation: captures.campaigns,
  leadReactivationDetail: captures.contacts,
  workspaceOverview: captures.dashboard,
  default: captures.dashboard,
  productScreenshot: captures.dashboard,
} as const;
