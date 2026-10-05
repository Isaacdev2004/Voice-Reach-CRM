/** Marketing hero shots in `/public/brand/`. */
export const HERO_IMAGES = {
  crmDashboard: {
    src: "/brand/hero-crm-dashboard.png",
    alt: "ARI real estate CRM dashboard with portal leads, automated SMS, email campaigns, and voicemail drops",
  },
  followUpWorkflow: {
    src: "/brand/hero-follow-up-workflow.png",
    alt: "ARI automated follow-up workflow from portal leads and open houses through SMS, email, and check-in sequences",
  },
  leadReactivation: {
    src: "/brand/hero-lead-reactivation.png",
    alt: "ARI Lead Reactivation dashboard turning dormant leads into appointments and conversations",
  },
  leadReactivationDetail: {
    src: "/brand/hero-lead-reactivation-detail.png",
    alt: "ARI Lead Reactivation with smart segmentation, campaigns, replies, and booked appointments",
  },
  default: {
    src: "/brand/ari-dashboard-hero.png",
    alt: "ARI real estate CRM dashboard showing contacts, sales pipeline, and automated lead follow-up",
  },
} as const;

export type HeroImage = (typeof HERO_IMAGES)[keyof typeof HERO_IMAGES];
