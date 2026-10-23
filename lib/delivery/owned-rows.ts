import { supabaseAdmin } from "@/lib/supabaseAdmin";
/** Read every page in a deterministic order; never silently accept Supabase's default row cap. */
export async function ownedRows<T>(
  table: string,
  columns: string,
  ownerId: string,
  campaignId?: string,
  extra: Record<string, string> = {},
): Promise<T[]> {
  const all: T[] = [];
  const seen = new Set<string>();
  let expected: number | null = null;
  const size = 500;
  for (let offset = 0; ;) {
    let q = supabaseAdmin
      .from(table)
      .select(columns, { count: "exact" })
      .eq("owner_id", ownerId)
      .order("id", { ascending: true })
      .range(offset, offset + size - 1);
    if (campaignId) q = q.eq("campaign_id", campaignId);
    for (const [key, value] of Object.entries(extra)) q = q.eq(key, value);
    const { data, error, count } = await q;
    if (
      error ||
      typeof count !== "number" ||
      count < 0 ||
      (expected !== null && count !== expected)
    )
      throw new Error(
        "Campaign information is temporarily unavailable. Please try again.",
      );
    expected = count;
    const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    for (const row of rows) {
      if (typeof row.id !== "string" || seen.has(row.id))
        throw new Error(
          "Campaign information is temporarily unavailable. Please try again.",
        );
      seen.add(row.id);
    }
    all.push(...(rows as unknown as T[]));
    if (all.length > expected || (!rows.length && all.length < expected))
      throw new Error(
        "Campaign information is temporarily unavailable. Please try again.",
      );
    if (all.length === expected) return all;
    offset += rows.length;
  }
}
