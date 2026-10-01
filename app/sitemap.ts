import type { MetadataRoute } from "next";
import { INDEXABLE_PATHS, SITE_URL } from "@/lib/seo/site";

const HIGH_PRIORITY_PATHS = new Set([
  "/real-estate-crm",
  "/lead-follow-up",
  "/realtor-lead-follow-up",
  "/lead-reactivation",
  "/pricing",
]);

function sitemapPriority(path: string): number {
  if (path === "/") return 1;
  if (HIGH_PRIORITY_PATHS.has(path)) return 0.9;
  if (path === "/contact") return 0.8;
  if (path === "/about") return 0.7;
  return 0.5;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return INDEXABLE_PATHS.map((path) => ({
    url: path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
    priority: sitemapPriority(path),
  }));
}
