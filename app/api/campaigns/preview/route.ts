import { apiError, apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadWorkspaceSettings } from "@/lib/settings/load-workspace";
import { previewSequence } from "@/lib/campaigns/sequence-preview";
import { delayFromDayLabel } from "@/lib/campaigns/delay-from-day-label";
import { z } from "zod";
const Body = z.object({
  contactId: z.string().uuid(),
  steps: z
    .array(
      z.object({
        id: z.string().max(200),
        order: z.number().int().nonnegative(),
        type: z.enum([
          "email",
          "sms",
          "voicemail",
          "callback",
          "task",
          "wait",
          "avatar_video",
          "retargeting",
        ]),
        title: z.string().max(300),
        description: z.string().max(50000),
        dayLabel: z.string().max(100),
        timeLabel: z.string().max(100),
        delayMinutes: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1)
    .max(100),
});
export const POST = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const body = Body.parse(await request.json());
  const { data: contact, error } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("owner_id", owner)
    .eq("id", body.contactId)
    .maybeSingle();
  if (error)
    return apiError("Preview is temporarily unavailable.", { status: 503 });
  if (!contact) return apiError("Contact not found.", { status: 404 });
  const { workspace, profile } = await loadWorkspaceSettings(owner, {
    outbound: true,
  });
  return apiOk({
    previews: previewSequence(
      body.steps.map((s) => ({
        id: s.id,
        step_order: s.order,
        type: s.type,
        title: s.title,
        description: s.description,
        delay_minutes: s.delayMinutes ?? delayFromDayLabel(s.dayLabel),
        time_label: s.timeLabel,
      })),
      {
        contact,
        agentName: workspace.defaultSenderName || profile.fullName,
        agentPhone: profile.phone,
        brokerage: workspace.name,
        timezone: profile.timezone,
      },
    ),
    message: "Content preview only. No messages sent or records changed.",
  });
});
