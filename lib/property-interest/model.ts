import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

export const DISCLOSURE_VERSION = "myari-property-interest-v1";
export const CreateShare = z.object({
  contactId: z.string().uuid(),
  url: z.string().max(2048),
  label: z.string().trim().min(1).max(140),
  windowDays: z.number().int().min(1).max(30).default(7),
});
export function canonicalProperty(raw: string) {
  const u = new URL(raw);
  if (u.protocol !== "https:" || !["www.zillow.com", "zillow.com"].includes(u.hostname) ||
      u.port || u.username || u.password) throw new Error("Use a Zillow individual-property HTTPS URL.");
  const match = u.pathname.match(/^\/homedetails\/(?:[A-Za-z0-9_%.,~-]+\/)?([0-9]+)_zpid\/?$/);
  if (!match) throw new Error("Use a Zillow individual-property URL, not a search link.");
  return { propertyKey: "zillow:" + match[1], url: "https://www.zillow.com" + u.pathname.replace(/\/$/, "") + "/" };
}
export const opaque = () => randomBytes(32).toString("base64url");
export const tokenHash = (s: string) => createHash("sha256").update(s).digest("hex");
export const validToken = (s: unknown): s is string => typeof s === "string" && /^[A-Za-z0-9_-]{43}$/.test(s);
export function automaticTraffic(headers: Headers) {
  return !headers.get("user-agent") ||
    /bot|crawl|spider|preview|scanner|headless|facebookexternalhit|slack|whatsapp|curl|wget/i.test(headers.get("user-agent") ?? "") ||
    /prefetch|prerender/i.test((headers.get("purpose") ?? "") + (headers.get("sec-purpose") ?? "")) ||
    headers.get("sec-gpc") === "1";
}
export function ownerEnabled(owner: string) {
  return process.env.VERCEL_ENV === "preview" && process.env.PROPERTY_INTEREST_ENABLED === "true" &&
    (process.env.PROPERTY_INTEREST_OWNER_IDS ?? "").split(",").map(s => s.trim()).includes(owner);
}
export function publicEnabled() {
  return process.env.VERCEL_ENV === "preview" && process.env.PROPERTY_INTEREST_ENABLED === "true";
}
