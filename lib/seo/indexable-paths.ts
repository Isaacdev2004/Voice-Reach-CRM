import { FEATURE_PAGE_SLUGS, FEATURE_PAGES } from "@/lib/seo/feature-pages";
import { RESOURCE_ARTICLE_SLUGS, RESOURCE_ARTICLES } from "@/lib/seo/resource-articles";

const CORE_MARKETING_PATHS = [
  "/",
  "/real-estate-crm",
  "/lead-follow-up",
  "/realtor-lead-follow-up",
  "/lead-reactivation",
  "/crm-for-small-business",
  "/pricing",
  "/about",
  "/contact",
  "/resources",
  "/features",
] as const;

const FEATURE_PATHS = FEATURE_PAGE_SLUGS.map((slug) => FEATURE_PAGES[slug].path);
const RESOURCE_PATHS = RESOURCE_ARTICLE_SLUGS.map((slug) => RESOURCE_ARTICLES[slug].path);

const LEGAL_PATHS = [
  "/privacy",
  "/terms",
  "/tcpa-consent",
  "/acceptable-use",
  "/refunds",
  "/dpa",
  "/sms-consent",
] as const;

/** All indexable marketing and legal paths (no trailing slashes). */
export const INDEXABLE_PATHS = [
  ...CORE_MARKETING_PATHS,
  ...FEATURE_PATHS,
  ...RESOURCE_PATHS,
  ...LEGAL_PATHS,
] as const;

export type IndexablePath = (typeof INDEXABLE_PATHS)[number];
