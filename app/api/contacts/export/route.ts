import { requireUserId } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { readContactSnapshot } from "@/lib/contacts/read-snapshot";
import { createContactExportHandler } from "@/lib/contacts/export-handler";
export const runtime="nodejs";
export const maxDuration=120;
export const POST=createContactExportHandler({
 requireOwnerId:requireUserId,
 readContacts:owner=>readContactSnapshot(supabaseAdmin,owner),
});
