import { sharedReceiver } from "@/lib/communications/safety";
import { readDelivery } from "@/lib/delivery/store";
import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { mapAuditRow, mapDeliveryRow } from "@/lib/activity/map-audit";
import type { ActivityLogEntry } from "@/lib/activity/types";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ownedRows } from "@/lib/delivery/owned-rows";
import { safeActivityMetadata } from "@/lib/activity/intelligence";
import { z } from "zod";

const PostSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["read", "dismiss", "acknowledge"]),
});

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();

  const [auditRes, deliveryRes] = await Promise.all([
    ownedRows<{
      id: string;
      action: string;
      entity_type: string;
      entity_id: string | null;
      metadata: Record<string, unknown>;
      created_at: string;
    }>(
      "audit_logs",
      "id, action, entity_type, entity_id, metadata, created_at",
      ownerId,
    )
      .then((data) => ({ data, error: null }))
      .catch(() => ({ data: [], error: true })),
    supabaseAdmin
      .from("campaign_recipients")
      .select(
        "id, delivery_status, updated_at, contacts(owner_id, first_name, last_name), campaigns(owner_id, name)",
      )
      .eq("owner_id", ownerId)
      .neq("delivery_status", "not_sent")
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);

  if (auditRes.error || deliveryRes.error)
    return apiError("Activity is temporarily unavailable.", { status: 503 });

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
      const contacts = Array.isArray(raw.contacts)
        ? raw.contacts[0]
        : raw.contacts;
      const campaigns = Array.isArray(raw.campaigns)
        ? raw.campaigns[0]
        : raw.campaigns;
      const mapped = mapDeliveryRow({
        id: raw.id,
        delivery_status: raw.delivery_status,
        updated_at: raw.updated_at,
        contacts: contacts?.owner_id === ownerId ? contacts : null,
        campaigns: campaigns?.owner_id === ownerId ? campaigns : null,
      });
      if (mapped) deliveryEntries.push(mapped);
    }
  }

  const evidence = await readDelivery(ownerId).catch(() => null);
  const verifiedEntries: ActivityLogEntry[] = (evidence?.records ?? []).map(
    (r) => ({
      id: `evidence-${r.id}`,
      category: "engagement",
      icon: "fact_check",
      tone: r.failure ? "error" : "default",
      title: `${r.contact} · ${r.indicator}`,
      body: `${r.campaign} · ${r.channel} · ${r.step}`,
      createdAt: r.events.at(-1)?.received_at ?? r.created_at,
      source: "delivery",
      alert: !!r.failure,
      href: `/dashboard/delivery`,
      metadata: { messageId: r.id, status: r.status },
    }),
  );
  const engagement = await ownedRows<{
    id: string;
    event_type: string;
    channel: string;
    contact_id: string | null;
    campaign_id: string | null;
    occurred_at: string;
    metadata: Record<string, unknown>;
  }>("engagement_events", "*", ownerId).catch(() => null);
  if (!engagement)
    return apiError("Activity could not be fully loaded. Please retry.", {
      status: 503,
    });
  const replyEntries: ActivityLogEntry[] = engagement
    .filter((e) => ["replied", "callback", "opt_out"].includes(e.event_type) && !sharedReceiver(String(e.metadata?.to ?? "")))
    .map((e) => ({
      id: `engagement-${e.id}`,
      category: "engagement",
      icon: e.event_type === "callback" ? "call" : "chat",
      tone: "default",
      title:
        e.event_type === "replied"
          ? "Client reply received"
          : e.event_type === "callback"
            ? "Callback recorded"
            : "Opt-out received",
      body:
        typeof e.metadata?.body === "string"
          ? e.metadata.body
          : "Open the contact to review this interaction.",
      createdAt: e.occurred_at,
      source: "audit",
      action: e.event_type,
      entityType: "contact",
      entityId: e.contact_id,
      href: e.contact_id ? `/dashboard/contacts/${e.contact_id}` : undefined,
      metadata: {
        ...safeActivityMetadata(e.metadata),
        contactId: e.contact_id,
        campaignId: e.campaign_id,
        channel: e.channel,
        direction: "Inbound",
      },
    }));
  const inbound = await ownedRows<{
    id: string;
    kind: string;
    contact_id: string | null;
    from_number: string;
    body: string;
    status: string;
    duration: number | null;
    received_at: string;
  }>("inbound_communications", "*", ownerId).catch(() => null);
  const incomingEntries: ActivityLogEntry[] = (inbound ?? [])
    .filter((e) => e.kind === "call" || !e.contact_id)
    .map((e) => ({
      id: `inbound-${e.id}`,
      category: "engagement",
      icon: e.kind === "call" ? "call" : "chat",
      tone: ["no-answer", "busy", "failed"].includes(e.status)
        ? "warning"
        : "default",
      title:
        e.kind === "call"
          ? `Incoming call · ${e.status}`
          : "Incoming SMS needs contact review",
      body:
        e.kind === "call"
          ? `Provider-reported ${e.status}${e.duration !== null ? ` · ${e.duration} seconds` : ""}. Forwarded call answering is not inferred.`
          : e.body,
      createdAt: e.received_at,
      source: "audit",
      action: e.kind === "call" ? "INBOUND_CALL" : "UNMATCHED_SMS",
      entityType: e.contact_id ? "contact" : "communication",
      entityId: e.contact_id,
      href: e.contact_id
        ? `/dashboard/contacts/${e.contact_id}`
        : "/dashboard/activity",
      alert:
        !e.contact_id || ["no-answer", "busy", "failed"].includes(e.status),
      metadata: {
        contactId: e.contact_id,
        channel: e.kind === "call" ? "call" : "sms",
        direction: "Inbound",
        status: e.status,
        from: e.from_number,
      },
    }));
  const merged = [
    ...incomingEntries,
    ...replyEntries,
    ...auditEntries,
    ...(evidence ? verifiedEntries : deliveryEntries),
  ].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const entries = [
    ...new Map(
      merged.map((e) => [
        e.id,
        { ...e, metadata: safeActivityMetadata(e.metadata) },
      ]),
    ).values(),
  ];
  const state = await supabaseAdmin
    .from("activity_read_state")
    .select("event_id,read,dismissed")
    .eq("owner_id", ownerId);

  return apiOk({
    entries,
    state: state.data ?? [],
    stateAvailable: !state.error,
    communicationsAvailable: inbound !== null,
    coverage:
      "All account audit and engagement records; provider evidence uses the Delivery Audit read model. Legacy recipient fallback is limited to the 40 most recent rows.",
    counts: {
      total: entries.length,
      audit: auditEntries.length,
      delivery: evidence ? verifiedEntries.length : deliveryEntries.length,
      seed: 0,
    },
  });
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const { ids, action } = PostSchema.parse(await request.json());

  const valid = ids
    .filter((id) =>
      /^(audit|evidence|delivery|engagement|inbound)-[a-zA-Z0-9-]+$/.test(id),
    )
    .slice(0, 1000);
  if (valid.length !== ids.length)
    return apiError("Invalid activity selection.", { status: 400 });
  const { error } = await supabaseAdmin.from("activity_read_state").upsert(
    valid.map((event_id) => ({
      owner_id: ownerId,
      event_id,
      read: true,
      ...(action !== "read" ? { dismissed: true } : {}),
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "owner_id,event_id" },
  );
  if (error)
    return apiError("Read status could not be saved. Please retry.", {
      status: 503,
    });
  return apiOk({ ok: true });
});
