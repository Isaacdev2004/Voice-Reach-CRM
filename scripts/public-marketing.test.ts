import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { FEATURE_PAGES, FEATURE_DISPLAY_ORDER } from "../lib/seo/feature-pages";
import {
  PUBLIC_NAV_GROUPS,
  MARKETING_FOOTER_PRODUCT,
  MARKETING_FOOTER_FEATURES,
  MARKETING_FOOTER_RESOURCES,
  MARKETING_FOOTER_COMPANY,
  MARKETING_FOOTER_LEGAL,
} from "../lib/seo/marketing-nav";
import { INDEXABLE_PATHS } from "../lib/seo/indexable-paths";
import { SITE_OFFER, primaryTrialCta } from "../lib/marketing/site-offer";
import { RESOURCE_ARTICLES } from "../lib/seo/resource-articles";
import { SEO_LANDING_PAGES } from "../lib/seo/landing-pages";
import { HERO_IMAGES } from "../lib/marketing/hero-images";
const known = new Set<string>([...INDEXABLE_PATHS, "/sign-in", "/sign-up"]);
const links: { href: string; label: string }[] = [
  ...PUBLIC_NAV_GROUPS.flatMap<{ href: string; label: string }>((g) => g.links),
  ...MARKETING_FOOTER_PRODUCT,
  ...MARKETING_FOOTER_FEATURES,
  ...MARKETING_FOOTER_RESOURCES,
  ...MARKETING_FOOTER_COMPANY,
  ...MARKETING_FOOTER_LEGAL,
];
for (const link of links)
  assert.ok(known.has(link.href), `Unresolved navigation: ${link.href}`);
for (const p of [
  ...Object.values(FEATURE_PAGES),
  ...Object.values(RESOURCE_ARTICLES),
  ...Object.values(SEO_LANDING_PAGES),
]) {
  assert.ok(p.title && p.description, `Missing SEO metadata: ${p.path}`);
  assert.ok(known.has(p.path), `Missing sitemap route: ${p.path}`);
}
assert.equal(new Set(FEATURE_DISPLAY_ORDER).size, 20);
assert.equal(SITE_OFFER.cardRequired, false);
assert.equal(primaryTrialCta(), `Start My ${SITE_OFFER.trialDays}-Day Trial`);
for (const img of Object.values(HERO_IMAGES))
  assert.ok(existsSync("public" + img.src));
for (const href of INDEXABLE_PATHS) {
  const file = href === "/" ? "app/page.tsx" : `app${href}/page.tsx`;
  assert.ok(
    existsSync(file) ||
      href.startsWith("/features/") ||
      href.startsWith("/resources/"),
    `Missing route: ${href}`,
  );
}
console.log(
  `Public marketing: ${links.length} navigation/footer destinations and ${INDEXABLE_PATHS.length} indexable routes valid; metadata, image files, feature coverage and unchanged trial source verified.`,
);
