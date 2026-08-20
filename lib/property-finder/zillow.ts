export function zillowSearchUrl(options: { area?: string | null; budget?: number | null }) {
  const area = options.area?.trim();
  const path = area
    ? `https://www.zillow.com/homes/${encodeURIComponent(area.replace(/\s+/g, "-"))}_rb/`
    : "https://www.zillow.com/homes/for_sale/";

  if (options.budget && options.budget > 0) {
    const state = {
      pagination: {},
      filterState: { price: { max: { value: Math.round(options.budget) } } },
    };
    return `${path}?searchQueryState=${encodeURIComponent(JSON.stringify(state))}`;
  }
  return path;
}
