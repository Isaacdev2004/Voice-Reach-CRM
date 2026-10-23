import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export const calendarLinksEnabled = () =>
  process.env.CALENDAR_LINKS_ENABLED === "true";
export const hashLinkToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newLinkToken = () => randomBytes(32).toString("base64url");
export type ShareLink = {
  id: string;
  owner_id: string;
  kind: "feed" | "booking";
  active: boolean;
  config: Record<string, unknown>;
};
export async function resolveShareLink(
  token: string,
  kind: "feed" | "booking",
) {
  if (!calendarLinksEnabled() || !/^[-\w]{43}$/.test(token)) return null;
  const r = await supabaseAdmin
    .from("calendar_share_links")
    .select("id, owner_id, kind, active, config")
    .eq("token_hash", hashLinkToken(token))
    .eq("kind", kind)
    .eq("active", true)
    .maybeSingle();
  if (r.error) throw Error("Calendar sharing is unavailable.");
  return r.data as ShareLink | null;
}
