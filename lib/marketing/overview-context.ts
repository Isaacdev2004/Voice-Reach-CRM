import { z } from "zod";

const attribution = z
  .string()
  .trim()
  .max(100)
  .regex(/^[a-zA-Z0-9 _.-]*$/);
export const OverviewContext = z
  .object({
    plan: z.enum(["starter", "growth", "pro", "team"]).optional(),
    billing: z.enum(["monthly", "yearly"]).optional(),
    utm_source: attribution.optional(),
    utm_medium: attribution.optional(),
    utm_campaign: attribution.optional(),
    ref: attribution.optional(),
  })
  .strict();
export type OverviewContextValue = z.infer<typeof OverviewContext>;

/** Retain only non-sensitive plan/referral context. Never copy checkout/session/redirect tokens. */
export function overviewContext(
  search: string,
  saved: Record<string, unknown> = {},
): OverviewContextValue {
  const query = new URLSearchParams(search);
  const result: Record<string, string> = {};
  for (const [key, schema] of Object.entries(OverviewContext.shape)) {
    const value = query.get(key) ?? saved[key];
    if (typeof value !== "string") continue;
    const parsed = schema.safeParse(value);
    if (parsed.success && parsed.data) result[key] = parsed.data;
  }
  return OverviewContext.parse(result);
}

export function overviewReturnPath(context: OverviewContextValue) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(OverviewContext.parse(context))) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return `/sign-up${query ? `?${query}` : ""}`;
}
