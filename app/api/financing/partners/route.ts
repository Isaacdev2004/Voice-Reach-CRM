import { apiSuccess, apiError } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { financingHandler } from "@/lib/financing/api";
import { PartnerSchema } from "@/lib/financing/schemas";
import { z } from "zod";
export const GET = financingHandler(async () => {
  const owner = await requireUserId();
  const r = await supabaseAdmin
    .from("financing_partners")
    .select("id,payload,preferred,kind")
    .eq("owner_id", owner)
    .order("created_at");
  if (r.error) throw r.error;
  return apiSuccess({
    partners: r.data.map((row) => ({
      ...row.payload,
      id: row.id,
      preferred: row.preferred,
      kind: row.kind,
    })),
  });
});
export const POST = financingHandler(async (request) => {
  const owner = await requireUserId(),
    body = PartnerSchema.parse(await request.json());
  const r = await supabaseAdmin.rpc("save_financing_partner", {
    p_owner: owner,
    p_id: body.id ?? crypto.randomUUID(),
    p_payload: body,
    p_existing: !!body.id,
  });
  if (r.error?.message?.includes("NOT_FOUND"))
    return apiError("Partner not found", { status: 404 });
  if (r.error) throw r.error;
  return apiSuccess({
    partner: {
      ...r.data.payload,
      id: r.data.id,
      preferred: r.data.preferred,
      kind: r.data.kind,
    },
  });
});
export const DELETE = financingHandler(async (request) => {
  const owner = await requireUserId(),
    id = z.string().uuid().parse(new URL(request.url).searchParams.get("id"));
  const r = await supabaseAdmin
    .from("financing_partners")
    .delete()
    .eq("owner_id", owner)
    .eq("id", id)
    .select("id");
  if (r.error) throw r.error;
  if (!r.data?.length) return apiError("Partner not found", { status: 404 });
  return apiSuccess({ deleted: true });
});
