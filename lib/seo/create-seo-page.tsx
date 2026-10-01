import { SeoLandingPage } from "@/components/marketing/seo-landing-page";
import { pageMetadata } from "@/lib/seo/metadata";
import { SEO_LANDING_PAGES, type SeoPageSlug } from "@/lib/seo/landing-pages";

export function createSeoPage(slug: SeoPageSlug) {
  const page = SEO_LANDING_PAGES[slug];

  return {
    metadata: pageMetadata({
      title: page.title,
      description: page.description,
      path: page.path,
    }),
    default: function SeoPage() {
      return <SeoLandingPage page={page} />;
    },
  };
}
