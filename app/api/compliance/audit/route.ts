import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { scanContactsForCompliance } from "@/lib/compliance/scan";
import { apiErrorFromSupabase } from "@/lib/supabase-errors";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select(
      "id, phone, dnc, consent_records(status, consent_date, source, proof_reference, created_at)",
    )
    .eq("owner_id", ownerId);

  if (error) {
    const mapped = apiErrorFromSupabase(error);
    if (mapped) return mapped;
  }

  const result = scanContactsForCompliance(data ?? []);

  await writeAuditLog({
    ownerId,
    action: "COMPLIANCE_AUDIT_RUN",
    entityType: "contacts",
    entityId: null,
    metadata: {
      total: result.total,
      eligible: result.eligible,
      issueCounts: result.issues.map((i) => ({ id: i.id, count: i.count })),
    },
  });

  return apiOk(result as unknown as Record<string, unknown>);
});
