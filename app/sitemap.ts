import type { MetadataRoute } from "next";
import { INDEXABLE_PATHS, SITE_URL } from "@/lib/seo/site";

const HIGH_PRIORITY_PATHS = new Set([
  "/real-estate-crm",
  "/lead-follow-up",
  "/realtor-lead-follow-up",
  "/lead-reactivation",
  "/pricing",
  "/resources",
  "/features",
]);

const MEDIUM_PRIORITY_PREFIXES = ["/features/", "/resources/"];

function sitemapPriority(path: string): number {
  if (path === "/") return 1;
  if (HIGH_PRIORITY_PATHS.has(path)) return 0.9;
  if (MEDIUM_PRIORITY_PREFIXES.some((prefix) => path.startsWith(prefix))) return 0.8;
  if (path === "/contact" || path === "/crm-for-small-business") return 0.75;
  return 0.5;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return INDEXABLE_PATHS.map((path) => ({
    url: path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`,
    lastModified,
    changeFrequency:
      path === "/" || path.startsWith("/resources/")
        ? ("weekly" as const)
        : ("monthly" as const),
    priority: sitemapPriority(path),
  }));
}
