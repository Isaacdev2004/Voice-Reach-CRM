import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { AssistantFailure } from "./store";
import type { Proposal } from "./schema";
export type ProposalRoot = {
  current_proposal_id: string;
  state: "draft" | "claimed" | "cancelled";
  updated_at?: string;
};
export async function proposalRoot(
  owner: string,
  p: Proposal,
): Promise<ProposalRoot | null> {
  const r = await supabaseAdmin
    .from("assistant_proposal_roots")
    .select("current_proposal_id,state,updated_at")
    .eq("owner_id", owner)
    .eq("root_id", p.rootId ?? p.id)
    .maybeSingle();
  if (r.error)
    throw new AssistantFailure(
      "Proposal safety storage is unavailable. Nothing may be executed.",
      503,
    );
  return r.data;
}
export async function advanceProposal(
  owner: string,
  p: Proposal,
  operation: "create" | "revise" | "claim" | "cancel",
  expected?: string,
) {
  const r = await supabaseAdmin.rpc("advance_assistant_proposal", {
    p_owner: owner,
    p_root: p.rootId ?? p.id,
    p_proposal: p.id,
    p_expected: expected ?? null,
    p_operation: operation,
  });
  if (
    r.error ||
    !r.data ||
    r.data.owner_id !== owner ||
    r.data.current_proposal_id !== p.id ||
    r.data.state !==
      (operation === "cancel"
        ? "cancelled"
        : operation === "claim"
          ? "claimed"
          : "draft")
  )
    throw new AssistantFailure(
      "Proposal changed, was already claimed, or needs a fresh preview. Reload before continuing; do not retry a send.",
      ["PGRST202", "42883", "42P01"].includes(r.error?.code ?? "") ? 503 : 409,
    );
}
