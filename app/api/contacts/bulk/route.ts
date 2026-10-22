import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createContactBulkHandler } from "@/lib/contacts/bulk-handler";

export const POST = createContactBulkHandler({ database: supabaseAdmin, requireOwnerId: requireUserId, audit: writeAuditLog });
