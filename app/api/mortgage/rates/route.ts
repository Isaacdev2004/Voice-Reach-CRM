import { apiOk, withApiHandler } from "@/lib/api-response";
import { getMortgageMarketRates, toLegacyRatesPayload } from "@/lib/mortgage/market-rates";

/** @deprecated Prefer GET /api/mortgage/market-rates for structured PMMS data. */
export const GET = withApiHandler(async () => {
  const payload = await getMortgageMarketRates(6);
  return apiOk(toLegacyRatesPayload(payload));
});
