import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { scanContactsForCompliance } from "@/lib/compliance/scan";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const ownerId = await requireUserId();

  const { data, error } = await supabaseAdmin
    .from("contacts")
    .select("id, phone, dnc, consent_records(status, consent_date, source, proof_reference, created_at)")
    .eq("owner_id", ownerId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

  return NextResponse.json(result);
}
