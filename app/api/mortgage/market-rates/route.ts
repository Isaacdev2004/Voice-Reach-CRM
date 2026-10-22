import { apiOk, withApiHandler } from "@/lib/api-response";
import { getMortgageMarketRates, type MortgageMarketRatesPayload } from "@/lib/mortgage/market-rates";

function parseHistoryMonths(raw: string | null): 3 | 6 | 12 {
  if (raw === "3") return 3;
  if (raw === "12") return 12;
  return 6;
}

export const GET = withApiHandler(async (req: Request) => {
  const url = new URL(req.url);
  const historyMonths = parseHistoryMonths(url.searchParams.get("historyMonths"));
  const payload: MortgageMarketRatesPayload = await getMortgageMarketRates(historyMonths);
  return apiOk(payload);
});
