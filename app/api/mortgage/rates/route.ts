import { apiOk, withApiHandler } from "@/lib/api-response";

const FALLBACK = {
  freddieMac: { rate30: 6.85, rate15: 6.15 },
  fannieMae: { rate30: 6.72, rate15: 6.05 },
  source: "estimate" as const,
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
  const fetchedAt = new Date().toISOString();

  try {
    const [freddieMac30, freddieMac15, fannieMae30, fannieMae15] = await Promise.all([
      latestFredRate("MORTGAGE30US"),
      latestFredRate("MORTGAGE15US"),
      latestFredRate("OBMMIC30YF"),
      latestFredRate("OBMMIC15YF"),
    ]);

    const hasFreddie = Boolean(freddieMac30 || freddieMac15);
    const hasFannie = Boolean(fannieMae30 || fannieMae15);

    if (hasFreddie || hasFannie) {
      const freddieMac = {
        rate30: freddieMac30 ?? FALLBACK.freddieMac.rate30,
        rate15: freddieMac15 ?? FALLBACK.freddieMac.rate15,
      };
      const fannieMae = {
        rate30: fannieMae30 ?? FALLBACK.fannieMae.rate30,
        rate15: fannieMae15 ?? FALLBACK.fannieMae.rate15,
      };

      return apiOk({
        freddieMac,
        fannieMae,
        rate30: freddieMac.rate30,
        rate15: freddieMac.rate15,
        source: "fred",
        fetchedAt,
      });
    }
  } catch {
    // fall through
  }

  return apiOk({
    freddieMac: FALLBACK.freddieMac,
    fannieMae: FALLBACK.fannieMae,
    rate30: FALLBACK.freddieMac.rate30,
    rate15: FALLBACK.freddieMac.rate15,
    source: FALLBACK.source,
    fetchedAt,
  });
});
