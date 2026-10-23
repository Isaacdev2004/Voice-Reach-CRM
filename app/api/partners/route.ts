import { apiError, apiSuccess, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const CreateSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  type: z.enum(["lender", "co_agent", "vendor", "team_member", "other"]).default("lender"),
  brandColor: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();

  const [partnersRes, invitesRes, assetsRes] = await Promise.all([
    supabaseAdmin
      .from("partner_workspaces")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("partner_invitations")
      .select("*")
      .eq("owner_id", ownerId)
      .order("invited_at", { ascending: false }),
    supabaseAdmin
      .from("partner_shared_assets")
      .select("*")
      .eq("owner_id", ownerId)
      .order("shared_at", { ascending: false }),
  ]);

  if (partnersRes.error) return apiError(partnersRes.error.message, { status: 500 });

  return apiSuccess({
    partners: partnersRes.data ?? [],
    invitations: invitesRes.data ?? [],
    sharedAssets: assetsRes.data ?? [],
  });
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const body = CreateSchema.parse(await request.json());

  const row = {
    owner_id: ownerId,
    name: body.name,
    type: body.type,
    brand_color: body.brandColor ?? null,
    logo_url: body.logoUrl || null,
    notes: body.notes ?? null,
  };

  const { data, error } = body.id
    ? await supabaseAdmin
        .from("partner_workspaces")
        .update(row)
        .eq("id", body.id)
        .eq("owner_id", ownerId)
        .select("*")
        .single()
    : await supabaseAdmin
        .from("partner_workspaces")
        .insert(row)
        .select("*")
        .single();

  if (error) return apiError(error.message, { status: 500 });

  await writeAuditLog({
    ownerId,
    action: body.id ? "PARTNER_UPDATED" : "PARTNER_CREATED",
    entityType: "partner_workspace",
    entityId: null,
    metadata: { name: body.name, type: body.type },
  });

  return apiSuccess({ partner: data });
});

export const DELETE = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return apiError("Missing id", { status: 400 });
  const { error } = await supabaseAdmin
    .from("partner_workspaces")
    .delete()
    .eq("id", id)
    .eq("owner_id", ownerId);
  if (error) return apiError(error.message, { status: 500 });
  return apiSuccess({ ok: true });
});
