import type { HeroImage } from "./hero-images";

/** Real implemented UI, synthetic demonstration records. No customer screenshots. */
export const PRODUCT_CAPTURES = {
  dashboard: {
    src: "/brand/product-captures/dashboard.webp",
    alt: "Actual MyARI Dashboard and daily priorities with synthetic demo records",
    width: 1440,
    height: 1580,
    variant: "capture",
  },
  contacts: {
    src: "/brand/product-captures/contacts.webp",
    alt: "Actual MyARI Contact table, lifecycle filters and contact details with synthetic demo records",
    width: 1158,
    height: 600,
    variant: "capture",
  },
  campaigns: {
    src: "/brand/product-captures/campaigns.webp",
    alt: "Actual MyARI Campaign library with synthetic demo records",
    width: 1440,
    height: 1086,
    variant: "capture",
  },
  sequence: {
    src: "/brand/product-captures/sequence.webp",
    alt: "Actual MyARI Campaign sequence preview with synthetic demo records",
    width: 1440,
    height: 1086,
    variant: "capture",
  },
  voice: {
    src: "/brand/product-captures/voice.webp",
    alt: "Actual MyARI Voice Studio script editor and audio controls with synthetic demo records",
    width: 1500,
    height: 1837,
    variant: "capture",
  },
  calendar: {
    src: "/brand/product-captures/calendar.webp",
    alt: "Actual MyARI Seven-day hourly Calendar with synthetic demo records",
    width: 700,
    height: 700,
    variant: "capture",
  },
  assistant: {
    src: "/brand/product-captures/assistant.webp",
    alt: "Actual MyARI Ask MyARI email draft with synthetic demo records",
    width: 1152,
    height: 1280,
    variant: "capture",
  },
  analytics: {
    src: "/brand/product-captures/analytics.webp",
    alt: "Actual MyARI Analytics reporting with synthetic demo records",
    width: 2592,
    height: 1600,
    variant: "capture",
  },
  tasks: {
    src: "/brand/product-captures/tasks.webp",
    alt: "Actual MyARI Tasks and follow-up workspace with synthetic demo records",
    width: 1240,
    height: 600,
    variant: "capture",
  },
  notes: {
    src: "/brand/product-captures/notes.webp",
    alt: "Actual MyARI Notes and linked planning workspace with synthetic demo records",
    width: 1155,
    height: 690,
    variant: "capture",
  },
  properties: {
    src: "/brand/product-captures/properties.webp",
    alt: "Actual MyARI Property Finder and saved buyer searches with synthetic demo records",
    width: 1240,
    height: 690,
    variant: "capture",
  },
  financing: {
    src: "/brand/product-captures/financing.webp",
    alt: "Actual MyARI Financing and mortgage estimation workspace with synthetic demo records",
    width: 1240,
    height: 700,
    variant: "capture",
  },
} as const satisfies Record<string, HeroImage>;
