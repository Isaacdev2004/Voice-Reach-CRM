import { apiOk, withApiHandler } from "@/lib/api-response";

const FALLBACK = {
  rate30: 6.85,
  rate15: 6.15,
  source: "estimate",
};

async function latestFredRate(seriesId: string) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`;
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 6 } });
  if (!res.ok) return null;
  const text = await res.text();
  const rows = text.trim().split("\n").slice(1).reverse();
  for (const row of rows) {
    const value = row.split(",")[1]?.trim();
    const n = Number(value);
    if (value && value !== "." && Number.isFinite(n)) return n;
  }
  return null;
}

export const GET = withApiHandler(async () => {
  try {
    const [rate30, rate15] = await Promise.all([
      latestFredRate("MORTGAGE30US"),
      latestFredRate("MORTGAGE15US"),
    ]);
    if (rate30 || rate15) {
      return apiOk({
        rate30: rate30 ?? FALLBACK.rate30,
        rate15: rate15 ?? FALLBACK.rate15,
        source: "fred",
        fetchedAt: new Date().toISOString(),
      });
    }
  } catch {
    // fall through
  }

  return apiOk({
    ...FALLBACK,
    fetchedAt: new Date().toISOString(),
  });
});
