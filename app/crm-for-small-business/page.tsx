import { SeoLandingPage } from "@/components/marketing/seo-landing-page";
import { pageMetadata } from "@/lib/seo/metadata";
import { SMALL_BUSINESS_PAGE, SMALL_BUSINESS_PATH } from "@/lib/seo/small-business-page";

export const metadata = pageMetadata({
  title: SMALL_BUSINESS_PAGE.title,
  description: SMALL_BUSINESS_PAGE.description,
  path: SMALL_BUSINESS_PATH,
});

export default function CrmForSmallBusinessPage() {
  return <SeoLandingPage page={SMALL_BUSINESS_PAGE} />;
}
