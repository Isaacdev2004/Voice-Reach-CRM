import { BRAND_NAME } from "@/lib/brand";
import { absoluteUrl, SITE_URL } from "@/lib/seo/site";

const SUPPORT_EMAIL = "hello@myari.io";

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: `${BRAND_NAME} CRM`,
    alternateName: ["ARI Real Estate CRM", "ARI Lead Follow-Up"],
    url: SITE_URL,
    logo: absoluteUrl("/brand/ari-logo.png"),
    email: SUPPORT_EMAIL,
    description:
      "ARI CRM helps real estate agents organize leads, automate follow-up, and convert more opportunities into clients.",
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: `${BRAND_NAME} CRM`,
    url: SITE_URL,
    description:
      "Automated lead follow-up and real estate CRM for agents and Realtors.",
    publisher: {
      "@type": "Organization",
      name: `${BRAND_NAME} CRM`,
      url: SITE_URL,
    },
  };
}

export function softwareApplicationSchema(options?: {
  name?: string;
  description?: string;
  url?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: options?.name ?? `${BRAND_NAME} CRM`,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Customer Relationship Management",
    operatingSystem: "Web",
    url: options?.url ?? SITE_URL,
    description:
      options?.description ??
      "Real estate CRM with automated SMS, email, and ringless voicemail follow-up for agents.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "14-day free trial",
      url: absoluteUrl("/pricing"),
    },
    provider: {
      "@type": "Organization",
      name: `${BRAND_NAME} CRM`,
      url: SITE_URL,
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function articleSchema(options: {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  modifiedAt?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: options.title,
    description: options.description,
    url: absoluteUrl(options.path),
    datePublished: options.publishedAt,
    dateModified: options.modifiedAt ?? options.publishedAt,
    author: {
      "@type": "Organization",
      name: `${BRAND_NAME} CRM`,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: `${BRAND_NAME} CRM`,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/brand/ari-logo.png"),
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(options.path),
    },
  };
}

export function homepageSchema() {
  return [organizationSchema(), websiteSchema(), softwareApplicationSchema()];
}
