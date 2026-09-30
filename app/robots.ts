import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/sign-in/", "/sign-up/", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
