import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const InviteSchema = z.object({
  partnerId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["viewer", "collaborator", "approver"]).default("collaborator"),
});

const UpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["accepted", "revoked", "expired"]),
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = InviteSchema.parse(await request.json());

  const token = `vr_inv_${crypto.randomUUID().replace(/-/g, "").slice(0, 28)}`;

  const { data, error } = await supabaseAdmin
    .from("partner_invitations")
    .insert({
      owner_id: ownerId,
      partner_id: body.partnerId,
      email: body.email.toLowerCase(),
      role: body.role,
      status: "pending",
      token,
    })
    .select("*")
    .single();

  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: "PARTNER_INVITED",
    entityType: "partner_invitation",
    entityId: null,
    metadata: { partnerId: body.partnerId, email: body.email, role: body.role },
  });

  return apiSuccess({ invitation: data });
});

export const PATCH = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = UpdateSchema.parse(await request.json());

  const update: Record<string, unknown> = { status: body.status };
  if (body.status === "accepted") update.accepted_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("partner_invitations")
    .update(update)
    .eq("id", body.id)
    .eq("owner_id", ownerId)
    .select("*")
    .single();

  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: `PARTNER_INVITE_${body.status.toUpperCase()}`,
    entityType: "partner_invitation",
    entityId: null,
    metadata: { invitationId: body.id, status: body.status },
  });

  return apiSuccess({ invitation: data });
});
