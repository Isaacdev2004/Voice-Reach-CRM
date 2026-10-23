import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { readDelivery } from "@/lib/delivery/store";
import { requireUserId } from "@/lib/auth";
import { recordEngagementEvent } from "@/lib/engagement/record";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const QuerySchema = z.object({
  contactId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const PostSchema = z.object({
  contactId: z.string().uuid().nullable().optional(),
  campaignId: z.string().uuid().nullable().optional(),
  stepId: z.string().uuid().nullable().optional(),
  eventType: z.enum([
    "delivered",
    "listened",
    "clicked",
    "opened",
    "replied",
    "callback",
    "opt_out",
    "blocked",
    "failed",
    "task_completed",
  ]),
  channel: z
    .enum(["voicemail", "sms", "email", "video", "task", "callback", "system"])
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const GET = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const url = new URL(request.url);
  const params = QuerySchema.parse({
    contactId: url.searchParams.get("contactId") ?? undefined,
    campaignId: url.searchParams.get("campaignId") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  let query = supabaseAdmin
    .from("engagement_events")
    .select("*, contacts(owner_id, first_name, last_name)")
    .eq("owner_id", ownerId)
    .order("occurred_at", { ascending: false })
    .limit(params.limit);

  if (params.contactId) query = query.eq("contact_id", params.contactId);
  if (params.campaignId) query = query.eq("campaign_id", params.campaignId);

  const { data, error } = await query;
  if (error)
    return apiError("Contact activity is temporarily unavailable.", {
      status: 503,
    });

  const totalScore =
    params.contactId &&
    (await supabaseAdmin
      .from("engagement_events")
      .select("score")
      .eq("owner_id", ownerId)
      .eq("contact_id", params.contactId)
      .then((r) => (r.data ?? []).reduce((s, row) => s + (row.score ?? 0), 0)));

  const evidence = await readDelivery(ownerId).catch(() => null);
  const actual =
    evidence?.records
      .filter(
        (r) =>
          (!params.contactId || r.contact_id === params.contactId) &&
          (!params.campaignId || r.campaign_id === params.campaignId),
      )
      .flatMap((r) =>
        r.events
          .filter((e) =>
            [
              "delivered",
              "opened",
              "clicked",
              "replied",
              "opt_out",
              "failed",
            ].includes(e.event_type),
          )
          .map((e) => ({
            id: e.id,
            contact_id: r.contact_id,
            campaign_id: r.campaign_id,
            step_id: r.step_id,
            event_type: e.event_type,
            channel: r.channel,
            score: 0,
            occurred_at: e.occurred_at ?? e.received_at,
            metadata: {
              provider: r.provider,
              evidence: "verified",
              timestampKind: e.occurred_at ? "provider" : "received",
            },
          })),
      ) ?? [];
  const historical = (data ?? [])
    .filter(
      (e) =>
        (e.metadata as { evidence?: string } | null)?.evidence !== "verified",
    )
    .map((e) => ({
      ...e,
      contacts:
        (Array.isArray(e.contacts) ? e.contacts[0] : e.contacts)?.owner_id ===
        ownerId
          ? e.contacts
          : null,
      metadata: {
        evidence: "unverified",
        provider:
          (e.metadata as { provider?: string } | null)?.provider === "mock"
            ? "mock"
            : undefined,
      },
    }));
  const events = [...actual, ...historical]
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, params.limit);
  return apiSuccess({
    events,
    score:
      typeof totalScore === "number"
        ? Math.max(0, Math.min(100, totalScore))
        : null,
  });
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = PostSchema.parse(await request.json());
  for (const [table, id] of [
    ["contacts", body.contactId],
    ["campaigns", body.campaignId],
    ["campaign_steps", body.stepId],
  ] as const) {
    if (!id) continue;
    const owned = await supabaseAdmin
      .from(table)
      .select("id")
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (owned.error)
      return apiError("Activity could not be saved.", { status: 503 });
    if (!owned.data)
      return apiError("Related record not found.", { status: 404 });
  }
  const event = await recordEngagementEvent({
    ownerId,
    contactId: body.contactId ?? null,
    campaignId: body.campaignId ?? null,
    stepId: body.stepId ?? null,
    eventType: body.eventType,
    channel: body.channel,
    metadata: { ...body.metadata, evidence: "manual" },
  });
  return apiSuccess({ event });
});
