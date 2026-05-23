import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAnalyticsSnapshot } from "@/lib/analytics/compute";
import type { AnalyticsRange } from "@/lib/analytics/types";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const QuerySchema = z.object({
  range: z.enum(["7d", "30d", "90d", "all"]).optional().default("30d"),
});

export async function GET(request: Request) {
  const ownerId = await requireUserId();
  const { searchParams } = new URL(request.url);
  const { range } = QuerySchema.parse({ range: searchParams.get("range") ?? "30d" });

  const [contactsRes, campaignsRes, recipientsRes] = await Promise.all([
    supabaseAdmin
      .from("contacts")
      .select("id, dnc, consent_records(status)")
      .eq("owner_id", ownerId),
    supabaseAdmin
      .from("campaigns")
      .select("id, name, status, provider, created_at")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("campaign_recipients")
      .select("id, campaign_id, delivery_status, updated_at, created_at")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false })
      .limit(5000),
  ]);

  if (contactsRes.error) {
    return NextResponse.json({ error: contactsRes.error.message }, { status: 500 });
  }
  if (campaignsRes.error) {
    return NextResponse.json({ error: campaignsRes.error.message }, { status: 500 });
  }
  if (recipientsRes.error) {
    return NextResponse.json({ error: recipientsRes.error.message }, { status: 500 });
  }

  const snapshot = buildAnalyticsSnapshot({
    range: range as AnalyticsRange,
    contacts: contactsRes.data ?? [],
    campaigns: campaignsRes.data ?? [],
    recipients: recipientsRes.data ?? [],
  });

  return NextResponse.json(snapshot);
}
