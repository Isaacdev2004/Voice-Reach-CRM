import { contactSegment } from "@/lib/contacts/lifecycle";
import { z } from "zod";
import {
  ChecklistAction,
  PreferencesAction,
  TaskAction,
  NoteAction,
  MessageAction,
  CalendarAction,
  CampaignAction,
  VoiceAction,
  FlyerAction,
  FinancingAction,
  FollowUpAction,
} from "./schema";
import type { ProviderTool } from "./provider";
import { brandKit, ownedContact, rows, searchContacts } from "./reads";
import { prepareAction } from "./proposals";
import { AssistantFailure, put, entries, digest, getProposal } from "./store";
import { readContactActivity } from "@/lib/activity/read-model";
import { readCalendar } from "@/lib/calendar/read-model";
import { readDelivery } from "@/lib/delivery/store";
import { buildAnalyticsSnapshot } from "@/lib/analytics/compute";
import { ownedRows } from "@/lib/delivery/owned-rows";
const id = z.string().uuid(),
  empty = z.object({}).strict(),
  contact = z.object({ contactId: id }).strict(),
  search = z
    .object({
      query: z
        .string()
        .trim()
        .max(80)
        .regex(/^[\p{L}\p{N}\s@.'+_-]*$/u),
    })
    .strict();
const schemas = {
  search_contacts: search,
  read_contact: contact,
  read_contact_history: contact,
  read_proposal: z.object({ proposalId: id }).strict(),
  read_assistant_work: empty,
  read_setup_status: empty,
  read_voice_scripts: empty,
  read_voice_asset: z.object({ voiceAssetId: id }).strict(),
  read_event: z.object({ eventId: id }).strict(),
  read_note: z.object({ noteId: id }).strict(),
  read_buyer_preferences: contact,
  read_transaction_milestones: z.object({ contactId: id.optional() }).strict(),
  read_preferred_partners: empty,
  read_daily_briefing: empty,
  find_opportunities: empty,
  read_campaign_enrollments: z
    .object({ campaignId: id, contactId: id.optional() })
    .strict(),
  read_campaigns: z.object({ campaignId: id.optional() }).strict(),
  read_tasks: z.object({ contactId: id.optional() }).strict(),
  read_calendar: z
    .object({
      from: z.string().datetime({ offset: true }),
      to: z.string().datetime({ offset: true }),
    })
    .strict(),
  search_notes: search,
  read_analytics: z
    .object({ range: z.enum(["7d", "30d", "90d"]).default("30d") })
    .strict(),
  read_saved_properties: z.object({ contactId: id.optional() }).strict(),
  read_brand_kit: empty,
  read_unanswered_replies: empty,
  read_checklist_templates: empty,
  read_planning_resources: empty,
  prepare_checklist: ChecklistAction,
  prepare_property_preferences: PreferencesAction,
  prepare_task: TaskAction,
  prepare_note: NoteAction,
  prepare_message: MessageAction,
  prepare_calendar: CalendarAction,
  prepare_campaign: CampaignAction,
  prepare_voice_script: VoiceAction,
  prepare_financing: FinancingAction,
  prepare_flyer: FlyerAction,
  prepare_follow_up: FollowUpAction,
};
export type ToolName = keyof typeof schemas;
const descriptions: Partial<Record<ToolName, string>> = {
  read_saved_properties:
    "Saved subscriber property addresses/preferences only. No live MLS/IDX listings or asking prices.",
  read_unanswered_replies:
    "Verified owner-attributed inbound SMS and outbound evidence; unknown/ambiguous provider attribution is never assigned.",
  prepare_message:
    "Prepare exact recipient and content preview only; never sends from a tool. A separate SEND confirmation may submit only with an existing authorized launched campaign and recipient enrollment; outside-campaign sending is unavailable.",
  read_calendar:
    "Read internal and connected Google calendar coverage for a range up to 31 days. Disconnected external availability is unknown.",
  prepare_flyer:
    "Draft flyer using an actual saved property address and approved Brand Kit. No listing facts or prices may be invented.",
  prepare_calendar:
    "Propose an internal appointment with explicit ISO offsets and timezone. Ask for missing timezone, date or time; never guess availability.",
};
export const toolDefinitions: ProviderTool[] = Object.entries(schemas).map(
  ([name, schema]) => ({
    name,
    description:
      descriptions[name as ToolName] ??
      (name.startsWith("prepare_")
        ? "Prepare a reviewable proposal only; no CRM mutation or external action."
        : "Read authenticated subscriber records, with source IDs and bounded results."),
    input_schema: z.toJSONSchema(
      name.startsWith("prepare_")
        ? schema.safeExtend({ revisionOf: z.string().uuid().optional() })
        : schema,
      { unrepresentable: "any" },
    ) as Record<string, unknown>,
  }),
);
export async function runTool(
  owner: string,
  name: string,
  input: unknown,
  conversation: string,
  operationId = crypto.randomUUID(),
) {
  if (!owner) throw new AssistantFailure("Unauthorized", 401);
  if (!Object.hasOwn(schemas, name))
    throw new AssistantFailure("Unknown or prohibited tool", 400);
  const key = name as ToolName;
  const schema = key.startsWith("prepare_")
    ? schemas[key].safeExtend({ revisionOf: z.string().uuid().optional() })
    : schemas[key];
  const data = schema.parse(input) as Record<string, unknown>;
  await put(owner, "tool", conversation, crypto.randomUUID(), {
    name: key,
    state: "started",
  });
  let result: unknown;
  if (key.startsWith("prepare_")) {
    const fingerprint = digest({ key, data });
    if (
      !(await put(owner, "tool_claim", conversation, operationId, {
        fingerprint,
      }))
    ) {
      const previous = (
        await entries(owner, "tool_result", conversation, 100)
      ).find((row) => row.metadata.operationId === operationId);
      if (!previous || previous.metadata.fingerprint !== fingerprint)
        throw new AssistantFailure(
          "Tool call is already in progress or changed. Recover existing work.",
          409,
        );
      return getProposal(owner, String(previous.metadata.proposalId));
    }
    const { revisionOf, ...action } = data;
    result = await prepareAction(owner, action, {
      revisionOf: typeof revisionOf === "string" ? revisionOf : undefined,
      meterDraft: true,
    });
    await put(owner, "tool_result", conversation, operationId, {
      operationId,
      fingerprint,
      proposalId: (result as { id: string }).id,
    });
  } else if (key === "read_checklist_templates") {
    const { TASK_TEMPLATES } = await import("@/lib/tasks/templates");
    result = {
      templates: TASK_TEMPLATES,
      source: "/dashboard/tasks?tab=templates",
      limitation:
        "Contractual deadlines require agent review; not inferred from offsets.",
    };
  } else if (key === "read_planning_resources") {
    const { CAMPAIGN_MATERIALS } =
      await import("@/lib/campaigns/premium-drafts");
    result = {
      resources: Object.entries(CAMPAIGN_MATERIALS).map(([key, title]) => ({
        key,
        title,
        href: `/api/campaign-materials/${key}`,
      })),
      limitation:
        "Shared planning drafts require approved subscriber branding/disclosures before client use. No automatic upload or sharing.",
    };
  } else if (key === "search_contacts")
    result = await searchContacts(owner, String(data.query));
  else if (key === "read_contact")
    result = await ownedContact(owner, String(data.contactId));
  else if (key === "read_proposal") {
    const { getProposal } = await import("./store");
    const { proposalOutcome } = await import("./proposals");
    result = {
      proposal: await getProposal(owner, String(data.proposalId)),
      outcome: await proposalOutcome(owner, String(data.proposalId)),
    };
  } else if (key === "read_assistant_work") {
    const { entries } = await import("./store");
    const [p, o] = await Promise.all([
      entries(owner, "proposal", undefined, 20),
      entries(owner, "outcome", undefined, 50),
    ]);
    result = p.map((row) => ({
      id: row.entity_id,
      action: row.metadata.action,
      at: row.created_at,
      outcome: o.find((x) => x.entity_id === row.entity_id)?.metadata ?? null,
    }));
  } else if (key === "read_voice_scripts") {
    const { readVoiceDrafts } = await import("@/lib/voice-studio/drafts-store");
    const d = await readVoiceDrafts(owner);
    result = {
      drafts: d.drafts.slice(0, 10),
      limited: d.drafts.length > 10,
      source: "/dashboard/voice-scripts",
    };
  } else if (key === "read_voice_asset") {
    result = await rows(
      owner,
      "voice_assets",
      "id,title,approved,studio_metadata",
      { id: String(data.voiceAssetId) },
    );
  } else if (key === "read_event") {
    result = await rows(
      owner,
      "calendar_events",
      "id,title,starts_at,ends_at,contact_id",
      { id: String(data.eventId) },
    );
  } else if (key === "read_setup_status") {
    const { savedSettings } = await import("./reads"),
      s = await savedSettings(owner);
    result = {
      profileNameConfigured: !!s?.profile?.fullName,
      phoneConfigured: !!s?.profile?.phone,
      timeZone: s?.profile?.timezone ?? null,
      brandKitApproved: !!s?.brandKit?.approved,
      hasLogo: !!s?.brandKit?.logoPath,
      hasHeadshot: !!s?.brandKit?.headshotPath,
      providerConnections:
        "Unverified; review actual Integrations status. No credential values exposed.",
      href: "/dashboard/settings",
    };
  } else if (key === "read_note")
    result = await rows(
      owner,
      "contact_notes",
      "id,contact_id,title,body,updated_at",
      { id: String(data.noteId) },
    );
  else if (key === "read_buyer_preferences") {
    await ownedContact(owner, String(data.contactId));
    result = await rows(
      owner,
      "contacts",
      "id,budget,preferred_area,preferred_property_type,preferred_sqft,preferred_beds,preferred_baths",
      { id: String(data.contactId) },
    );
  } else if (key === "read_transaction_milestones") {
    if (data.contactId) await ownedContact(owner, String(data.contactId));
    result = await rows(
      owner,
      "task_transactions",
      "id,contact_id,payload",
      data.contactId ? { contact_id: String(data.contactId) } : {},
    );
  } else if (key === "read_preferred_partners") {
    const partners = await rows(owner, "financing_partners", "id,kind,payload");
    result = {
      ...partners,
      records: partners.records.map((p) => ({
        id: p.id,
        kind: p.kind,
        name: (p.payload as Record<string, unknown>)?.name,
        preferred: (p.payload as Record<string, unknown>)?.preferred,
        brandingAuthorized: (p.payload as Record<string, unknown>)
          ?.brandingAuthorized,
      })),
    };
  } else if (key === "read_daily_briefing") {
    const { readPriorities } = await import("@/lib/assistant/briefing");
    result = await readPriorities(owner);
  } else if (key === "read_contact_history")
    result = await readContactActivity(owner, String(data.contactId), null);
  else if (key === "read_brand_kit") {
    const kit = await brandKit(owner);
    result = {
      ...kit,
      logoPath: undefined,
      headshotPath: undefined,
      hasApprovedLogo: !!kit.logoPath,
      hasApprovedHeadshot: !!kit.headshotPath,
    };
  } else if (key === "read_calendar") {
    const from = String(data.from),
      to = String(data.to);
    if (
      Date.parse(to) <= Date.parse(from) ||
      Date.parse(to) - Date.parse(from) > 31 * 86400000
    )
      throw new AssistantFailure("Choose a calendar range of up to 31 days");
    const c = await readCalendar(owner, from, to);
    result = {
      agenda: c.agenda.slice(0, 30),
      limited: c.agenda.length > 30,
      connected: c.connected,
      limitations: c.connected
        ? "Connected provider coverage only."
        : "External calendar availability is unverified.",
    };
  } else if (key === "read_analytics") {
    const [contacts, campaigns, evidence] = await Promise.all([
      ownedRows<{ id: string }>("contacts", "id", owner),
      ownedRows<{ id: string; name: string; status: string }>(
        "campaigns",
        "id,name,status",
        owner,
      ),
      readDelivery(owner),
    ]);
    result = {
      snapshot: buildAnalyticsSnapshot({
        range: data.range as "7d" | "30d" | "90d",
        contacts,
        campaigns,
        records: evidence.records,
      }),
      coverage: evidence.coverage,
      health: evidence.health,
    };
  } else if (key === "read_campaign_enrollments") {
    const campaign = await rows(owner, "campaigns", "id", {
      id: String(data.campaignId),
    });
    if (!campaign.records.length)
      throw new AssistantFailure("Campaign not found", 404);
    if (data.contactId) await ownedContact(owner, String(data.contactId));
    result = await rows(
      owner,
      "campaign_recipients",
      "id,campaign_id,contact_id,eligibility_status,delivery_status",
      {
        campaign_id: String(data.campaignId),
        ...(data.contactId ? { contact_id: String(data.contactId) } : {}),
      },
    );
  } else if (key === "read_campaigns") {
    const campaigns = await rows(
      owner,
      "campaigns",
      "id,name,status,updated_at",
      data.campaignId ? { id: String(data.campaignId) } : {},
    );
    if (data.campaignId && !campaigns.records.length)
      throw new AssistantFailure("Campaign not found", 404);
    const steps = data.campaignId
      ? await rows(
          owner,
          "campaign_steps",
          "id,step_order,type,title,description,delay_minutes",
          { campaign_id: String(data.campaignId) },
          "step_order",
        )
      : undefined;
    result = {
      ...campaigns,
      steps: steps?.records,
      stepsLimited: steps?.limited ?? false,
      editingScope:
        "Revise unsaved assistant proposals using revisionOf. Saved campaigns require the campaign editor; no in-place changes or activation are supported by this tool.",
    };
  } else if (key === "read_tasks") {
    if (data.contactId) await ownedContact(owner, String(data.contactId));
    result = await rows(
      owner,
      "contact_tasks",
      "id,contact_id,title,due_at,reminder_at,completed",
      data.contactId ? { contact_id: String(data.contactId) } : {},
    );
  } else if (key === "search_notes") {
    const all = await rows(
      owner,
      "contact_notes",
      "id,contact_id,title,body,updated_at",
    );
    result = {
      ...all,
      records: all.records.filter((r) =>
        `${r.title} ${r.body}`
          .toLowerCase()
          .includes(String(data.query).toLowerCase()),
      ),
      searchCoverage: "First 50 owner records; not a complete full-text index.",
    };
  } else if (key === "read_unanswered_replies") {
    const [inbound, outbound] = await Promise.all([
      rows(
        owner,
        "inbound_communications",
        "id,contact_id,kind,body,received_at",
      ),
      rows(
        owner,
        "outbound_messages",
        "id,contact_id,created_at,submission_status",
      ),
    ]);
    result = {
      records: inbound.records
        .filter(
          (r) =>
            r.kind === "sms" &&
            r.contact_id &&
            !outbound.records.some(
              (o) =>
                o.contact_id === r.contact_id &&
                o.submission_status === "accepted" &&
                String(o.created_at) > String(r.received_at),
            ),
        )
        .map((r) => ({
          ...r,
          status: outbound.limited
            ? "Response status unknown: outbound coverage is incomplete."
            : "No later accepted outbound message in available records; not proof of no response on other channels.",
        })),
      limited: inbound.limited || outbound.limited,
    };
  } else {
    const all = await rows(
      owner,
      "contacts",
      "id,first_name,last_name,type,budget,preferred_area,property_address",
    );
    let records = all.records;
    if (key === "read_saved_properties")
      records = records.filter(
        (r) =>
          !!r.property_address && (!data.contactId || r.id === data.contactId),
      );
    if (key === "find_opportunities")
      records = records.filter(
        (r) =>
          contactSegment(typeof r.type === "string" ? r.type : null) ===
          "active-lead",
      );
    result = {
      ...all,
      records,
      definition:
        key === "find_opportunities"
          ? "Active-lead lifecycle classification used by Dashboard Opportunities; not inferred intent or a revenue forecast."
          : undefined,
      source: "Subscriber-maintained CRM records; not live listing data.",
      href: "/dashboard/contacts",
    };
  }
  await put(owner, "tool", conversation, crypto.randomUUID(), {
    name: key,
    state: "finished",
  });
  return result;
}
