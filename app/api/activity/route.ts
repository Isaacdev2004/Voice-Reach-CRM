import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { mapAuditRow, mapDeliveryRow } from "@/lib/activity/map-audit";
import { SEED_ACTIVITY } from "@/lib/activity/seed";
import type { ActivityLogEntry } from "@/lib/activity/types";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const PostSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["read", "dismiss", "acknowledge"]),
});

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();

  const [auditRes, deliveryRes] = await Promise.all([
    supabaseAdmin
      .from("audit_logs")
      .select("id, action, entity_type, entity_id, metadata, created_at")
      .eq("owner_id", ownerId)
      .neq("action", "ACTIVITY_ACKNOWLEDGED")
      .order("created_at", { ascending: false })
      .limit(200),
    supabaseAdmin
      .from("campaign_recipients")
      .select(
        "id, delivery_status, updated_at, contacts(first_name, last_name), campaigns(name)",
      )
      .eq("owner_id", ownerId)
      .neq("delivery_status", "not_sent")
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);

  if (auditRes.error) return apiError(auditRes.error.message, { status: 500 });

  const auditEntries: ActivityLogEntry[] = [];
  for (const row of auditRes.data ?? []) {
    const mapped = mapAuditRow({
      id: row.id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      created_at: row.created_at,
    });
    if (mapped) auditEntries.push(mapped);
  }

  const deliveryEntries: ActivityLogEntry[] = [];
  if (!deliveryRes.error) {
    for (const raw of deliveryRes.data ?? []) {
      const contacts = Array.isArray(raw.contacts) ? raw.contacts[0] : raw.contacts;
      const campaigns = Array.isArray(raw.campaigns) ? raw.campaigns[0] : raw.campaigns;
      const mapped = mapDeliveryRow({
        id: raw.id,
        delivery_status: raw.delivery_status,
        updated_at: raw.updated_at,
        contacts: contacts ?? null,
        campaigns: campaigns ?? null,
      });
      if (mapped) deliveryEntries.push(mapped);
    }
  }

  const merged = [...auditEntries, ...deliveryEntries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const seen = new Set(merged.map((e) => e.id));
  const includeSeed = merged.length < 8;
  const entries = includeSeed
    ? [...merged, ...SEED_ACTIVITY.filter((s) => !seen.has(s.id))].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    : merged;

  return apiOk({
    entries,
    counts: {
      total: entries.length,
      audit: auditEntries.length,
      delivery: deliveryEntries.length,
      seed: includeSeed ? SEED_ACTIVITY.length : 0,
    },
  });
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const { ids, action } = PostSchema.parse(await request.json());

  if (action === "acknowledge") {
    await writeAuditLog({
      ownerId,
      action: "ACTIVITY_ACKNOWLEDGED",
      entityType: "activity",
      entityId: null,
      metadata: { ids, acknowledgedAt: new Date().toISOString() },
    });
  }

  return apiOk({ ok: true, ids, action });
});
