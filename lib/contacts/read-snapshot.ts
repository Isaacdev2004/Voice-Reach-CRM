import { ownedConsentRecords } from "./owned-consent";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiContact } from "@/lib/hooks/use-contacts";

export type OwnedContact = ApiContact & { owner_id: string; dnc: boolean };
export const CONTACT_SNAPSHOT_ERROR = "Unable to load complete contact totals. Please retry.";

/** Page under PostgREST's response cap. Never turn a failed/truncated read into partial totals. */
export async function readContactSnapshot(database: SupabaseClient, ownerId: string): Promise<OwnedContact[]> {
  if (!ownerId) throw new Error("Unauthorized");
  const unique = new Map<string, OwnedContact>();
  let expected: number | null = null;
  let offset = 0;
  for (;;) {
    const { data, error, count } = await database.from("contacts")
      .select("*, consent_records(*)", { count: "exact" })
      .eq("owner_id", ownerId)
      .order("id", { ascending: true })
      .range(offset, offset + 499);
    if (error) throw new Error(CONTACT_SNAPSHOT_ERROR);
    if (!Array.isArray(data) || !Number.isSafeInteger(count) || count === null || count < 0) throw new Error(CONTACT_SNAPSHOT_ERROR);
    if (expected !== null && count !== expected) throw new Error(CONTACT_SNAPSHOT_ERROR);
    expected = count;
    for (const row of data as OwnedContact[]) {
      if (!row.id || row.owner_id !== ownerId) throw new Error(CONTACT_SNAPSHOT_ERROR);
      const records = (row.consent_records ?? []) as (NonNullable<OwnedContact["consent_records"]>[number] & { owner_id?: string; contact_id?: string })[];
      unique.set(row.id, { ...row, consent_records: ownedConsentRecords(records, ownerId, row.id) });
    }
    offset += data.length;
    if (unique.size === expected) break;
    if (!data.length || offset >= expected || unique.size > expected) throw new Error(CONTACT_SNAPSHOT_ERROR);
  }
  // Preserve the existing newest-first list order after fetching by stable unique key.
  return [...unique.values()].sort((a, b) => (Date.parse(b.created_at ?? "") || 0) - (Date.parse(a.created_at ?? "") || 0));
}
