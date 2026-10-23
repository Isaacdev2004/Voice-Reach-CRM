import type { Fee } from "./calculators";
/** Server-only adapter contract. No provider enabled without a reviewed agreement and credentials. */
export type FeeQuoteRequest = {
  state: string;
  county: string;
  transaction: "purchase" | "refinance";
  price: number;
  loanAmount: number;
};
export type AuthorizedFeeQuote = {
  provider: string;
  quoteId: string;
  effectiveDate: string;
  expiresAt: string;
  fees: Fee[];
};
export interface TitleFeeProvider {
  quote(
    request: FeeQuoteRequest,
    signal: AbortSignal,
  ): Promise<AuthorizedFeeQuote>;
}
export const configuredTitleProvider: TitleFeeProvider | null = null;
