import { supabaseAdmin } from "./supabaseAdmin";

export async function writeAuditLog(params: {
  ownerId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("audit_logs").insert({
    owner_id: params.ownerId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId || null,
    metadata: params.metadata || {},
  });
  if (error) throw error;
}
