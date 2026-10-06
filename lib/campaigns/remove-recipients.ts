import { writeAuditLog } from "@/lib/audit";
import { contactMatchesCategory } from "@/lib/contacts/categories";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RecipientRow = {
  id: string;
  contact_id: string;
  contacts:
    | { id: string; category?: string | null; type?: string | null }
    | { id: string; category?: string | null; type?: string | null }[]
    | null;
};

export type RemoveCampaignRecipientsInput = {
  recipientIds?: string[];
  contactIds?: string[];
  category?: string;
  removeAll?: boolean;
};

function contactFromRow(row: RecipientRow) {
  const raw = row.contacts;
  return Array.isArray(raw) ? raw[0] : raw;
}

async function resolveRecipientIds(
  rows: RecipientRow[],
  input: RemoveCampaignRecipientsInput,
): Promise<string[]> {
  if (input.removeAll) {
    return rows.map((r) => r.id);
  }

  if (input.recipientIds?.length) {
    const allowed = new Set(rows.map((r) => r.id));
    return input.recipientIds.filter((id) => allowed.has(id));
  }

  if (input.contactIds?.length) {
    const contactSet = new Set(input.contactIds);
    return rows.filter((r) => contactSet.has(r.contact_id)).map((r) => r.id);
  }

  if (input.category?.trim()) {
    const category = input.category.trim();
    return rows
      .filter((r) => {
        const contact = contactFromRow(r);
        return contact && contactMatchesCategory(contact, category);
      })
      .map((r) => r.id);
  }

  return [];
}

/** Unenroll contacts from a campaign and cancel pending step runs. */
export async function removeCampaignRecipients(
  ownerId: string,
  campaignId: string,
  input: RemoveCampaignRecipientsInput,
) {
  const { data: rows, error: fetchError } = await supabaseAdmin
    .from("campaign_recipients")
    .select("id, contact_id, contacts(id, category, type)")
    .eq("campaign_id", campaignId)
    .eq("owner_id", ownerId);

  if (fetchError) throw new Error(fetchError.message);

  const recipientIds = await resolveRecipientIds((rows ?? []) as RecipientRow[], input);
  if (!recipientIds.length) {
    return { removed: 0, recipientIds: [] as string[] };
  }

  const now = new Date().toISOString();

  await supabaseAdmin
    .from("campaign_step_runs")
    .update({
      status: "skipped",
      executed_at: now,
      result: { reason: "recipient_removed" },
    })
    .eq("campaign_id", campaignId)
    .eq("owner_id", ownerId)
    .in("recipient_id", recipientIds)
    .in("status", ["scheduled", "running"]);

  const { error: deleteError } = await supabaseAdmin
    .from("campaign_recipients")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("owner_id", ownerId)
    .in("id", recipientIds);

  if (deleteError) throw new Error(deleteError.message);

  await supabaseAdmin
    .from("campaigns")
    .update({ updated_at: now })
    .eq("id", campaignId)
    .eq("owner_id", ownerId);

  await writeAuditLog({
    ownerId,
    action: "CAMPAIGN_RECIPIENTS_REMOVED",
    entityType: "campaign",
    entityId: campaignId,
    metadata: {
      removed: recipientIds.length,
      recipientIds,
      category: input.category ?? null,
      removeAll: Boolean(input.removeAll),
    },
  }).catch(() => undefined);

  return { removed: recipientIds.length, recipientIds };
}
