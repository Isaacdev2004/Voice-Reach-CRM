import type { ActivityLogEntry } from "./types";

type AuditRow = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

function entry(
  row: AuditRow,
  partial: Omit<ActivityLogEntry, "id" | "createdAt" | "source" | "action" | "entityType" | "entityId"> & {
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
): ActivityLogEntry {
  return {
    id: `audit-${row.id}`,
    createdAt: row.created_at,
    source: "audit",
    action: row.action,
    entityType: row.entity_type,
    entityId: partial.entityId ?? row.entity_id,
    ...partial,
  };
}

export function mapAuditRow(row: AuditRow): ActivityLogEntry | null {
  const meta = row.metadata ?? {};

  switch (row.action) {
    case "CONTACT_UPDATED": {
      const consent = meta.consent as string | undefined;
      return entry(row, {
        category: "contacts",
        icon: "edit",
        tone: "default",
        title: "Contact updated",
        body: consent ? `Contact record updated (consent: ${consent}).` : "Contact record updated.",
        href: row.entity_id ? `/dashboard/contacts/${row.entity_id}` : "/dashboard/contacts",
        metadata: meta,
      });
    }
    case "CONTACT_DELETED": {
      const name = meta.name as string | undefined;
      return entry(row, {
        category: "contacts",
        icon: "person_remove",
        tone: "warning",
        title: "Contact deleted",
        body: name ? `${name} was removed from your CRM.` : "A contact was removed from your CRM.",
        href: "/dashboard/contacts",
        metadata: meta,
      });
    }
    case "COMPLIANCE_AUDIT_RUN": {
      const total = meta.total as number | undefined;
      const eligible = meta.eligible as number | undefined;
      return entry(row, {
        category: "compliance",
        icon: "verified_user",
        tone: "accent",
        title: "Compliance audit completed",
        body: `Scanned ${total ?? 0} contacts — ${eligible ?? 0} eligible for outreach.`,
        href: "/dashboard/contacts",
        metadata: meta,
      });
    }
    case "CONTACT_CREATED": {
      const phone = meta.phone as string | undefined;
      return entry(row, {
        category: "contacts",
        icon: "person_add",
        tone: "success",
        title: "Contact created",
        body: phone ? `New contact added with phone ${phone}.` : "A new contact was added to your CRM.",
        href: row.entity_id ? `/dashboard/contacts/${row.entity_id}` : "/dashboard/contacts",
        metadata: meta,
      });
    }
    case "CSV_IMPORTED": {
      const imported = meta.imported as number | undefined;
      const errors = meta.errors as number | undefined;
      const fileName = meta.fileName as string | undefined;
      return entry(row, {
        category: "contacts",
        icon: "upload_file",
        tone: errors ? "warning" : "success",
        title: "CSV import completed",
        body: fileName
          ? `"${fileName}" — ${imported ?? 0} imported${errors ? `, ${errors} skipped` : ""}.`
          : `${imported ?? 0} contacts imported.`,
        href: "/dashboard/contacts",
        metadata: meta,
      });
    }
    case "CAMPAIGN_CREATED":
      return entry(row, {
        category: "campaigns",
        icon: "campaign",
        tone: "accent",
        title: "Campaign created",
        body: `Campaign queued with ${meta.recipients ?? 0} recipient(s).`,
        href: "/dashboard/campaigns",
        metadata: meta,
      });
    case "CAMPAIGN_TEMPLATE_SAVED": {
      const blueprint = meta.blueprint as { name?: string; audience?: string } | undefined;
      return entry(row, {
        category: "campaigns",
        icon: "bookmark",
        tone: "default",
        title: "Campaign template saved",
        body: blueprint?.name
          ? `"${blueprint.name}" saved as draft (${meta.stepCount ?? 0} steps).`
          : `Template saved with ${meta.stepCount ?? 0} steps.`,
        href: "/dashboard/campaigns",
        metadata: meta,
      });
    }
    case "CAMPAIGN_ACTIVATED": {
      const blueprint = meta.blueprint as { name?: string } | undefined;
      const enrollment = meta.enrollment as { enrolled?: number } | undefined;
      return entry(row, {
        category: "campaigns",
        icon: "rocket_launch",
        tone: "success",
        title: "Campaign activated",
        body: blueprint?.name
          ? `"${blueprint.name}" is live — ${enrollment?.enrolled ?? 0} contacts enrolled.`
          : `Campaign activated with ${enrollment?.enrolled ?? 0} enrolled contacts.`,
        href: "/dashboard/campaigns",
        metadata: meta,
      });
    }
    case "CAMPAIGN_SEND_ATTEMPTED": {
      const sent = meta.sentCount as number | undefined;
      const blocked = meta.blockedCount as number | undefined;
      const failed = meta.failedCount as number | undefined;
      const hasIssues = (blocked ?? 0) > 0 || (failed ?? 0) > 0;
      return entry(row, {
        category: hasIssues ? "compliance" : "campaigns",
        icon: hasIssues ? "warning" : "send",
        tone: hasIssues ? "warning" : "success",
        title: "Campaign send completed",
        body: `${sent ?? 0} sent · ${blocked ?? 0} blocked · ${failed ?? 0} failed.`,
        href: "/dashboard/campaigns",
        alert: hasIssues,
        metadata: meta,
      });
    }
    case "VOICE_SIGNED_UPLOAD_CREATED":
      return entry(row, {
        category: "voice",
        icon: "mic",
        tone: "accent",
        title: "Voice recording uploaded",
        body: "New voice asset uploaded — pending approval.",
        href: "/dashboard/voice-scripts",
        metadata: meta,
      });
    case "VOICE_APPROVED":
      return entry(row, {
        category: "voice",
        icon: "verified",
        tone: "success",
        title: "Voice asset approved",
        body: "Recording approved and ready for campaigns.",
        href: "/dashboard/voice-scripts",
        metadata: meta,
      });
    case "VOICE_ASSET_UPDATED": {
      const title = meta.title as string | undefined;
      return entry(row, {
        category: "voice",
        icon: "edit_note",
        tone: "default",
        title: "Voice asset updated",
        body: title ? `Updated "${title}".` : "Script or title was updated.",
        href: "/dashboard/voice-scripts",
        metadata: meta,
      });
    }
    case "AUTOMATION_SAVED": {
      const wf = meta.workflow as { name?: string; status?: string } | undefined;
      return entry(row, {
        category: "automation",
        icon: "account_tree",
        tone: "default",
        title: "Workflow saved",
        body: wf?.name ? `"${wf.name}" saved (${wf.status ?? "draft"}).` : "Automation workflow updated.",
        href: "/dashboard/automations",
        metadata: { workflowName: wf?.name, status: wf?.status },
      });
    }
    case "AUTOMATION_ACTIVATED": {
      const nodeCount = meta.nodeCount as number | undefined;
      return entry(row, {
        category: "automation",
        icon: "bolt",
        tone: "success",
        title: "Workflow activated",
        body: `Automation is live with ${nodeCount ?? 0} step(s).`,
        href: "/dashboard/automations",
        metadata: meta,
      });
    }
    case "ACTIVITY_ACKNOWLEDGED":
      return null;
    default:
      return entry(row, {
        category: "system",
        icon: "info",
        tone: "default",
        title: row.action.replace(/_/g, " ").toLowerCase(),
        body: `${row.entity_type} event recorded.`,
        metadata: meta,
      });
  }
}

type DeliveryRow = {
  id: string;
  delivery_status: string;
  updated_at: string;
  contacts: { first_name: string; last_name?: string | null } | null;
  campaigns: { name: string } | null;
};

export function mapDeliveryRow(row: DeliveryRow): ActivityLogEntry | null {
  if (row.delivery_status === "not_sent") return null;

  const name = row.contacts
    ? [row.contacts.first_name, row.contacts.last_name].filter(Boolean).join(" ")
    : "Contact";
  const campaign = row.campaigns?.name ?? "Campaign";

  const failed = row.delivery_status === "failed" || row.delivery_status === "blocked";
  const delivered = row.delivery_status === "delivered" || row.delivery_status === "sent";

  return {
    id: `delivery-${row.id}`,
    category: failed ? "compliance" : "engagement",
    icon: failed ? "block" : "voicemail",
    tone: failed ? "error" : "success",
    title: failed ? `Delivery blocked — ${name}` : `Voicemail delivered — ${name}`,
    body: failed
      ? `${name} could not receive message in "${campaign}".`
      : `${name} received your message in "${campaign}".`,
    createdAt: row.updated_at,
    source: "delivery",
    alert: failed,
    href: "/dashboard/campaigns",
  };
}
