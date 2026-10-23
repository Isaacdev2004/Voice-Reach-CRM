import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/metadata";
import { PublicProductExperience } from "@/components/marketing/public-product-experience";

export const metadata: Metadata = pageMetadata({
  title: "MyARI Features | Your Connected Real Estate Workspace",
  description:
    "Explore MyARI contacts, campaign automation, AI drafting, Voice Studio, Calendar, Property Finder and analytics. One connected workspace for real estate follow-up.",
  path: "/features",
});
export default function FeaturesIndexPage() {
  return <PublicProductExperience />;
}
