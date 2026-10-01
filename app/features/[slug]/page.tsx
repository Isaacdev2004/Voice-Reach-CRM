import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeatureLandingPage } from "@/components/marketing/feature-landing-page";
import { FEATURE_DISPLAY_ORDER, FEATURE_PAGES, type FeaturePageSlug } from "@/lib/seo/feature-pages";
import { pageMetadata } from "@/lib/seo/metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return FEATURE_DISPLAY_ORDER.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = FEATURE_PAGES[slug as FeaturePageSlug];
  if (!page) return {};
  return pageMetadata({ title: page.title, description: page.description, path: page.path });
}

export default async function FeaturePage({ params }: PageProps) {
  const { slug } = await params;
  const page = FEATURE_PAGES[slug as FeaturePageSlug];
  if (!page) notFound();
  return <FeatureLandingPage page={page} />;
}
