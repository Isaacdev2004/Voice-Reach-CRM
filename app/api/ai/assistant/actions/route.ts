import { privateSuccess as apiSuccess } from "@/lib/ai/assistant/http";
import { ActionSchema } from "@/lib/ai/assistant/schema";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { apiError, withApiHandler } from "@/lib/api-response";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
const schema = z
  .object({ id: z.string().uuid(), approve: z.boolean() })
  .strict();
export const POST = withApiHandler(async (request) => {
  const owner = await requireUserId();
  const b = schema.safeParse(await request.json().catch(() => null));
  if (!b.success) return apiError("Choose a valid proposal.", { status: 400 });
  const r = await supabaseAdmin.rpc("approve_ai_proposal", {
    p_owner: owner,
    p_id: b.data.id,
    p_approve: b.data.approve,
  });
  if (r.error)
    return apiError(
      "This proposal could not be saved. Refresh and verify the selected contact.",
      { status: 409 },
    );
  return apiSuccess({ proposal: r.data });
});

const revision = z
  .object({
    id: z.string().uuid(),
    expected: ActionSchema,
    payload: ActionSchema,
  })
  .strict();
export const PATCH = withApiHandler(async (request) => {
  const owner = await requireUserId(),
    b = revision.safeParse(await request.json().catch(() => null));
  if (!b.success)
    return apiError("Check the draft title, content and contact selection.", {
      status: 400,
    });
  const r = await supabaseAdmin.rpc("revise_ai_proposal", {
    p_owner: owner,
    p_id: b.data.id,
    p_expected: b.data.expected,
    p_payload: b.data.payload,
  });
  if (r.error)
    return apiError(
      "This draft changed or was already approved. Reload the conversation before editing.",
      { status: 409 },
    );
  return apiSuccess({ proposal: r.data });
});
