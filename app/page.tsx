import type { Metadata } from "next";
import { JsonLd } from "@/components/marketing/json-ld";
import { LandingPage } from "@/components/pages/stitch/LandingPage";
import { homepageSchema } from "@/lib/seo/schema";

export const metadata: Metadata = {
  title: "ARI CRM | Automated Lead Follow-Up for Realtors",
  description:
    "ARI helps real estate agents capture, organize, and automatically follow up with leads so opportunities don't fall through the cracks. Start your 14-day free trial.",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={homepageSchema()} />
      <LandingPage />
    </>
  );
}
