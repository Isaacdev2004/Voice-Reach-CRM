import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceArticlePage } from "@/components/marketing/resource-article-page";
import {
  RESOURCE_ARTICLES,
  RESOURCE_ARTICLE_SLUGS,
  type ResourceArticleSlug,
} from "@/lib/seo/resource-articles";
import { pageMetadata } from "@/lib/seo/metadata";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return RESOURCE_ARTICLE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = RESOURCE_ARTICLES[slug as ResourceArticleSlug];
  if (!article) return {};
  return pageMetadata({ title: article.title, description: article.description, path: article.path });
}

export default async function ResourceArticleRoute({ params }: PageProps) {
  const { slug } = await params;
  const article = RESOURCE_ARTICLES[slug as ResourceArticleSlug];
  if (!article) notFound();
  return <ResourceArticlePage article={article} />;
}
