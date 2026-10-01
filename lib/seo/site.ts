import { BRAND_NAME } from "@/lib/brand";

/** Preferred canonical origin (non-www redirects to www on Vercel). */
export const SITE_URL = "https://www.myari.io";

export const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/ari-dashboard-hero.png`;

export const siteMetadata = {
  siteName: `${BRAND_NAME} CRM`,
  twitterHandle: "@myari_io",
} as const;

export { INDEXABLE_PATHS, type IndexablePath } from "@/lib/seo/indexable-paths";

/** Route patterns that must bypass Clerk auth (marketing + auth entry). */
export const PUBLIC_ROUTE_PATTERNS = [
  "/",
  "/contact",
  "/about",
  "/pricing",
  "/real-estate-crm",
  "/lead-follow-up",
  "/realtor-lead-follow-up",
  "/lead-reactivation",
  "/crm-for-small-business",
  "/features(.*)",
  "/resources(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/checkout(.*)",
  "/sms-consent",
  "/privacy",
  "/terms",
  "/tcpa-consent",
  "/acceptable-use",
  "/refunds",
  "/dpa",
  "/robots.txt",
  "/sitemap.xml",
] as const;

export function absoluteUrl(path: string): string {
  if (path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
