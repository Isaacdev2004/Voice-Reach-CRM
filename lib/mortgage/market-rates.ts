/**
 * Freddie Mac Primary Mortgage Market Survey (PMMS) — official weekly CSV.
 * @see https://www.freddiemac.com/pmms
 * @see https://www.freddiemac.com/pmms/docs/PMMS_history.csv
 */

export const FREDDIE_MAC_PMMS_URL = "https://www.freddiemac.com/pmms";
export const FREDDIE_MAC_PMMS_CSV_URL = "https://www.freddiemac.com/pmms/docs/PMMS_history.csv";
export const FANNIE_MAE_FORECAST_URL = "https://www.fanniemae.com/data-and-insights/forecast";

export const MORTGAGE_RATES_DISCLAIMER =
  "Rates shown are national market averages for informational purposes only. They are not lender offers, guaranteed rates, or personalized loan quotes. Actual rates and terms depend on credit, loan details, lender pricing, and market conditions.";

export const FANNIE_FORECAST_DISCLAIMER =
  "Forecasts are projections and may change. They do not represent current mortgage offers.";

export type RateFreshness = "current" | "stale" | "unavailable";

export type PmmsObservation = {
  /** ISO date (UTC midnight from survey publication date) */
  date: string;
  rate30: number | null;
  rate15: number | null;
};

export type MortgageBenchmarkProduct = "30-year-fixed" | "15-year-fixed";

export type MortgageBenchmark = {
  product: MortgageBenchmarkProduct;
  label: string;
  rate: number | null;
  /** Change vs prior PMMS observation, percentage points */
  weeklyChange: number | null;
  publicationDate: string | null;
  source: "freddie_mac_pmms";
  sourceLabel: "Freddie Mac PMMS";
  sourceUrl: string;
  updateFrequency: "weekly";
  freshness: RateFreshness;
};

export type PmmsHistoryPoint = {
  date: string;
  rate: number;
};

export type FannieMaeRateOutlook = {
  available: boolean;
  rate30Forecast: number | null;
  forecastPeriod: string | null;
  publicationDate: string | null;
  sourceUrl: string;
};

export type MortgageMarketRatesPayload = {
  benchmarks: {
    rate30: MortgageBenchmark;
    rate15: MortgageBenchmark;
  };
  history30: {
    months: 3 | 6 | 12;
    points: PmmsHistoryPoint[];
    sourceLabel: string;
    sourceUrl: string;
  };
  fannieMaeOutlook: FannieMaeRateOutlook;
  retrievedAt: string;
  disclaimer: string;
  fannieDisclaimer: string;
};

const STALE_AFTER_MS = 10 * 24 * 60 * 60 * 1000;

function parsePmmsDate(raw: string): string | null {
  const trimmed = raw.trim();
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseRateCell(raw: string | undefined): number | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0 || n > 30) return null;
  return Math.round(n * 100) / 100;
}

/** Parse Freddie Mac PMMS consolidated CSV (no network). */
export function parsePmmsCsv(csvText: string): PmmsObservation[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const out: PmmsObservation[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row.trim()) continue;
    const cols = row.split(",");
    const date = parsePmmsDate(cols[0] ?? "");
    if (!date) continue;
    const rate30 = parseRateCell(cols[1]);
    const rate15 = parseRateCell(cols[3]);
    if (rate30 === null && rate15 === null) continue;
    out.push({ date, rate30, rate15 });
  }
  return out;
}

export function computeWeeklyChange(
  current: number | null,
  previous: number | null,
): number | null {
  if (current === null || previous === null) return null;
  return Math.round((current - previous) * 100) / 100;
}

export function freshnessForPublicationDate(publicationDate: string | null): RateFreshness {
  if (!publicationDate) return "unavailable";
  const published = Date.parse(`${publicationDate}T12:00:00.000Z`);
  if (Number.isNaN(published)) return "unavailable";
  const age = Date.now() - published;
  if (age > STALE_AFTER_MS) return "stale";
  return "current";
}

function buildBenchmark(
  product: MortgageBenchmarkProduct,
  label: string,
  rate: number | null,
  weeklyChange: number | null,
  publicationDate: string | null,
): MortgageBenchmark {
  return {
    product,
    label,
    rate,
    weeklyChange,
    publicationDate,
    source: "freddie_mac_pmms",
    sourceLabel: "Freddie Mac PMMS",
    sourceUrl: FREDDIE_MAC_PMMS_URL,
    updateFrequency: "weekly",
    freshness: rate === null ? "unavailable" : freshnessForPublicationDate(publicationDate),
  };
}

export function selectPmmsHistory(
  observations: PmmsObservation[],
  months: 3 | 6 | 12,
): PmmsHistoryPoint[] {
  if (observations.length === 0) return [];
  const latest = observations[observations.length - 1]!;
  const latestTime = Date.parse(`${latest.date}T12:00:00.000Z`);
  const cutoff = latestTime - months * 30 * 24 * 60 * 60 * 1000;

  const points: PmmsHistoryPoint[] = [];
  for (const row of observations) {
    const t = Date.parse(`${row.date}T12:00:00.000Z`);
    if (Number.isNaN(t) || t < cutoff) continue;
    if (row.rate30 !== null) points.push({ date: row.date, rate: row.rate30 });
  }
  return points;
}

export function readFannieMaeOutlookFromEnv(): FannieMaeRateOutlook {
  const empty: FannieMaeRateOutlook = {
    available: false,
    rate30Forecast: null,
    forecastPeriod: null,
    publicationDate: null,
    sourceUrl: FANNIE_MAE_FORECAST_URL,
  };

  const raw = process.env.MORTGAGE_FANNIE_OUTLOOK_JSON?.trim();
  if (!raw) return empty;

  try {
    const parsed = JSON.parse(raw) as {
      rate30Forecast?: unknown;
      forecastPeriod?: unknown;
      publicationDate?: unknown;
    };
    const rate30Forecast =
      typeof parsed.rate30Forecast === "number" && Number.isFinite(parsed.rate30Forecast)
        ? parsed.rate30Forecast
        : null;
    const forecastPeriod =
      typeof parsed.forecastPeriod === "string" ? parsed.forecastPeriod.trim() : null;
    const publicationDate =
      typeof parsed.publicationDate === "string" ? parsed.publicationDate.trim() : null;

    if (rate30Forecast === null && !forecastPeriod && !publicationDate) return empty;

    return {
      available: rate30Forecast !== null,
      rate30Forecast,
      forecastPeriod: forecastPeriod || null,
      publicationDate: publicationDate || null,
      sourceUrl: FANNIE_MAE_FORECAST_URL,
    };
  } catch {
    return empty;
  }
}

export function buildMarketRatesFromObservations(
  observations: PmmsObservation[],
  retrievedAt: string,
  historyMonths: 3 | 6 | 12 = 6,
): MortgageMarketRatesPayload {
  const latest = observations.length ? observations[observations.length - 1]! : null;
  const previous = observations.length > 1 ? observations[observations.length - 2]! : null;

  const rate30 = latest?.rate30 ?? null;
  const rate15 = latest?.rate15 ?? null;
  const pubDate = latest?.date ?? null;

  return {
    benchmarks: {
      rate30: buildBenchmark(
        "30-year-fixed",
        "30-Year Fixed",
        rate30,
        computeWeeklyChange(rate30, previous?.rate30 ?? null),
        pubDate,
      ),
      rate15: buildBenchmark(
        "15-year-fixed",
        "15-Year Fixed",
        rate15,
        computeWeeklyChange(rate15, previous?.rate15 ?? null),
        pubDate,
      ),
    },
    history30: {
      months: historyMonths,
      points: selectPmmsHistory(observations, historyMonths),
      sourceLabel: "Freddie Mac PMMS",
      sourceUrl: FREDDIE_MAC_PMMS_CSV_URL,
    },
    fannieMaeOutlook: readFannieMaeOutlookFromEnv(),
    retrievedAt,
    disclaimer: MORTGAGE_RATES_DISCLAIMER,
    fannieDisclaimer: FANNIE_FORECAST_DISCLAIMER,
  };
}

export async function fetchPmmsObservations(): Promise<PmmsObservation[]> {
  const res = await fetch(FREDDIE_MAC_PMMS_CSV_URL, {
    next: { revalidate: 60 * 60 * 12 },
    headers: { Accept: "text/csv,text/plain,*/*" },
  });
  if (!res.ok) throw new Error(`PMMS CSV HTTP ${res.status}`);
  const text = await res.text();
  return parsePmmsCsv(text);
}

export async function getMortgageMarketRates(
  historyMonths: 3 | 6 | 12 = 6,
): Promise<MortgageMarketRatesPayload> {
  const retrievedAt = new Date().toISOString();
  try {
    const observations = await fetchPmmsObservations();
    if (observations.length === 0) throw new Error("PMMS CSV empty");
    return buildMarketRatesFromObservations(observations, retrievedAt, historyMonths);
  } catch {
    return buildMarketRatesFromObservations([], retrievedAt, historyMonths);
  }
}

/** Legacy shape for `/api/mortgage/rates` consumers. */
export function toLegacyRatesPayload(payload: MortgageMarketRatesPayload) {
  const { rate30, rate15 } = payload.benchmarks;
  const hasData = rate30.rate !== null || rate15.rate !== null;
  return {
    freddieMac: {
      rate30: rate30.rate,
      rate15: rate15.rate,
    },
    fannieMae: {
      rate30: payload.fannieMaeOutlook.rate30Forecast,
      rate15: null as number | null,
    },
    rate30: rate30.rate,
    rate15: rate15.rate,
    source: hasData ? ("freddie_mac_pmms" as const) : ("unavailable" as const),
    publicationDate: rate30.publicationDate ?? rate15.publicationDate,
    fetchedAt: payload.retrievedAt,
    weeklyChange30: rate30.weeklyChange,
    weeklyChange15: rate15.weeklyChange,
  };
}
