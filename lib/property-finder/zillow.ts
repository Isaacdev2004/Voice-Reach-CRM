/**
 * Build a Zillow for-sale search URL that Zillow accepts on mobile + desktop.
 * Avoids fragile searchQueryState payloads that often return HTTP 400.
 */
export function zillowSearchUrl(options: { area?: string | null; budget?: number | null }) {
  const area = options.area?.trim();
  const budget =
    options.budget && Number.isFinite(options.budget) && options.budget > 0
      ? Math.round(options.budget)
      : null;

  const slug = area
    ? area
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    : "";

  // Path styles Zillow reliably serves:
  // /homes/for_sale/miami-fl/
  // /homes/for_sale/miami-fl/0-850000_price/
  if (slug && budget) {
    return `https://www.zillow.com/homes/for_sale/${slug}/0-${budget}_price/`;
  }
  if (slug) {
    return `https://www.zillow.com/homes/for_sale/${slug}/`;
  }
  if (budget) {
    return `https://www.zillow.com/homes/for_sale/0-${budget}_price/`;
  }
  return "https://www.zillow.com/homes/for_sale/";
}
