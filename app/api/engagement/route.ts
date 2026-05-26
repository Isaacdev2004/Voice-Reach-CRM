import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
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
    .select("*, contacts(first_name, last_name)")
    .eq("owner_id", ownerId)
    .order("occurred_at", { ascending: false })
    .limit(params.limit);

  if (params.contactId) query = query.eq("contact_id", params.contactId);
  if (params.campaignId) query = query.eq("campaign_id", params.campaignId);

  const { data, error } = await query;
  if (error) return apiError(error.message, { status: 500 });

  const totalScore =
    params.contactId &&
    (await supabaseAdmin
      .from("engagement_events")
      .select("score")
      .eq("owner_id", ownerId)
      .eq("contact_id", params.contactId)
      .then((r) => (r.data ?? []).reduce((s, row) => s + (row.score ?? 0), 0)));

  return apiSuccess({
    events: data ?? [],
    score: typeof totalScore === "number" ? Math.max(0, Math.min(100, totalScore)) : null,
  });
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = PostSchema.parse(await request.json());
  const event = await recordEngagementEvent({
    ownerId,
    contactId: body.contactId ?? null,
    campaignId: body.campaignId ?? null,
    stepId: body.stepId ?? null,
    eventType: body.eventType,
    channel: body.channel,
    metadata: body.metadata,
  });
  return apiSuccess({ event });
});
