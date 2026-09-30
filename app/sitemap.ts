import type { MetadataRoute } from "next";
import { INDEXABLE_PATHS, SITE_URL } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return INDEXABLE_PATHS.map((path) => ({
    url: path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: path === "/" ? ("weekly" as const) : ("monthly" as const),
    priority: path === "/" ? 1 : path === "/contact" ? 0.8 : 0.5,
  }));
}
