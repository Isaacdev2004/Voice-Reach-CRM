import { resolveRecipientAddress } from "@/lib/providers/dispatch-message";
import {
  senderSnapshot,
  assistantSendIssues,
} from "@/lib/providers/assistant-message";
import { advanceProposal, proposalRoot } from "./roots";
import { meteredAi } from "@/lib/billing/ai/meter";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ActionSchema, type AssistantAction, type Proposal } from "./schema";
import { AssistantFailure, put, digest, getProposal, entries } from "./store";
import { brandKit, ownedContact } from "./reads";
import { calculate, DISCLOSURE } from "@/lib/financing/calculators";
import { renderMessage } from "@/lib/campaigns/render-message";
import { savedSettings } from "./reads";
import { assertCanSendChannel } from "@/lib/billing/plan-limits";
import { authorizeLiveOutbound } from "@/lib/providers/send-authorization";
import { pickAdapterForChannel } from "@/lib/providers/registry";
import { readCalendar } from "@/lib/calendar/read-model";
export async function actionPreview(
  owner: string,
  action: AssistantAction,
): Promise<Record<string, unknown>> {
  const contact =
    "contactId" in action && action.contactId
      ? await ownedContact(owner, action.contactId)
      : null;
  const identity = contact
    ? {
        id: contact.id,
        name: [contact.first_name, contact.last_name].filter(Boolean).join(" "),
        href: `/dashboard/contacts/${contact.id}`,
      }
    : null;
  if (action.kind === "sms" || action.kind === "email") {
    const s = await savedSettings(owner),
      kit = s?.brandKit;
    const render = renderMessage(action.kind, action.body, action.subject, {
      contact: contact!,
      agentName:
        kit?.agentName ||
        s?.workspace?.defaultSenderName ||
        s?.profile?.fullName,
      agentPhone: kit?.phone || s?.profile?.phone,
      agentEmail: kit?.email,
      businessAddress: kit?.address,
      brokerage: kit?.businessName || s?.workspace?.name,
      zillowReviewUrl: kit?.zillowReviewUrl,
    });
    if (!render.ok)
      throw new AssistantFailure(
        "Message needs actual sender details or unresolved personalization: " +
          render.issues.join(" "),
        400,
      );
    const recipient = resolveRecipientAddress(action.kind, contact!).address,
      provider = pickAdapterForChannel(action.kind).id;
    const sender = senderSnapshot(action.kind);
    let issues: string[] = [
      "Direct sending requires an existing launched campaign and exact recipient enrollment.",
    ];
    if (action.campaignId && action.recipientId)
      issues = await authorizeLiveOutbound({
        ownerId: owner,
        contactId: contact!.id,
        channel: action.kind,
        to: recipient ?? "",
        campaignId: action.campaignId,
        recipientId: action.recipientId,
        body: render.body,
        subject: render.subject ?? undefined,
        approvedMessage: {
          ownerId: owner,
          contactId: contact!.id,
          campaignId: action.campaignId,
          recipientId: action.recipientId,
          to: recipient ?? "",
          from: sender.from ?? "",
          senderIdentity: sender.identity ?? "",
          provider,
          body: render.body,
          subject: render.subject,
        },
      });
    const quota = await assertCanSendChannel(owner, action.kind);
    if (!quota.ok) issues.push(quota.error);
    if (provider === "mock")
      issues.push("No authorized live provider is configured.");
    issues.push(...assistantSendIssues(owner, action.kind, recipient ?? ""));
    if (!sender.from || !sender.identity)
      issues.push(
        "Configure an authorized platform sender before preparing a Send preview.",
      );
    return {
      contact: identity,
      sender,
      recipient,
      subject: render.subject,
      body: render.body,
      channel: action.kind,
      provider,
      sendingSupported: issues.length === 0,
      authorizationIssues: issues,
      campaignId: action.campaignId ?? null,
      recipientId: action.recipientId ?? null,
      externalEffect:
        "One exact message to the displayed recipient; provider acceptance is not proof of delivery.",
      potentialCost:
        "Provider messaging fees may apply; exact cost is unavailable. One recipient only.",
      limitations: [
        "Outside-campaign sending is not supported. Existing consent, suppression, launched-campaign, shared-number routing, sender identity, quiet-hour and live-outbound gates remain enforced.",
      ],
      href: "/dashboard/campaigns",
    };
  }
  if (action.kind === "calendar") {
    const calendar = await readCalendar(owner, action.startsAt, action.endsAt);
    const conflicts = calendar.agenda.filter(
      (e) =>
        Date.parse(e.starts_at) < Date.parse(action.endsAt) &&
        Date.parse(e.ends_at) > Date.parse(action.startsAt),
    );
    return {
      contact: identity,
      ...action,
      conflicts: conflicts.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.starts_at,
        end: e.ends_at,
      })),
      externalCalendarConnected: calendar.connected,
      scope:
        "Save internal MyARI appointment only; no invitation or external event will be sent.",
      availabilityLimitation: calendar.connected
        ? "Connected calendar coverage only; rechecked on save."
        : "External availability is unverified while Google Calendar is disconnected.",
    };
  }
  if (action.kind === "checklist") {
    const { TASK_TEMPLATES } = await import("@/lib/tasks/templates");
    const { proposedDeadlines } = await import("@/lib/tasks/workspace-model");
    const template = TASK_TEMPLATES.find((t) => t.id === action.templateId);
    if (!template)
      throw new AssistantFailure(
        "Choose an existing supported checklist template",
        400,
      );
    if (action.propertyContactId)
      await ownedContact(owner, action.propertyContactId);
    return {
      contact: identity,
      ...action,
      template,
      proposedDeadlines: proposedDeadlines(
        template,
        action.baseDate,
        action.timeZone,
        action.closingDate,
      ),
      scope:
        "Save this explicitly approved checklist and its listed internal tasks; no external delivery.",
    };
  }
  if (action.kind === "property_preferences") {
    const { rows } = await import("./reads");
    const current = await rows(
      owner,
      "contacts",
      "id,budget,preferred_area,preferred_property_type,preferred_sqft,preferred_beds,preferred_baths",
      { id: action.contactId },
    );
    return {
      contact: identity,
      ...action,
      current: current.records[0],
      scope:
        "Update only the displayed buyer preference fields. No external property search or messages.",
    };
  }
  if (action.kind === "financing")
    return {
      calculation: action.calculation,
      result: calculate(action.calculation),
      disclosure: DISCLOSURE,
      href: "/dashboard/mortgage",
    };
  if (action.kind === "flyer") {
    const property = await ownedContact(owner, action.propertyContactId);
    if (!property.property_address?.trim())
      throw new AssistantFailure(
        "Choose an actual saved property with an address",
        400,
      );
    const kit = await brandKit(owner),
      partners = [];
    if (
      property.property_address.length > 150 ||
      [
        kit.agentName,
        kit.jobTitle,
        kit.businessName,
        kit.phone,
        kit.email,
        kit.website,
        kit.licenseNumber,
      ].join(" · ").length > 450 ||
      kit.disclosures.length > 240
    )
      throw new AssistantFailure(
        "This flyer layout needs a shorter reviewed address, contact block or disclosure. Use the source editor; text will not be clipped silently.",
        400,
      );
    for (const id of action.partnerIds) {
      const p = await supabaseAdmin
        .from("financing_partners")
        .select("id,kind,payload")
        .eq("owner_id", owner)
        .eq("id", id)
        .maybeSingle();
      if (p.error || !p.data?.payload?.brandingAuthorized)
        throw new AssistantFailure(
          "Selected partner branding is not authorized",
          403,
        );
      partners.push({
        id: p.data.id,
        kind: p.data.kind,
        name: p.data.payload.name,
        phone: p.data.payload.phone,
        email: p.data.payload.email,
      });
    }
    return {
      headline: action.headline,
      description: action.description,
      address: property.property_address,
      propertyContactId: property.id,
      price: action.price ?? null,
      priceSource: action.priceSource ?? null,
      propertySource:
        "Subscriber-maintained saved property; no MLS or listing authorization is inferred.",
      brand: kit,
      partners,
      sharingSupported: false,
      limitations: [
        "Review property facts, listing rights, pricing and disclosures before sharing.",
        "No external property imagery, fabricated listing details or generated text baked into images.",
      ],
    };
  }
  if (action.kind === "campaign")
    return {
      ...action,
      activationSupported: false,
      consentVerified: false,
      attachmentStatus:
        "None attached; use the existing builder to select authorized files.",
      voiceStatus:
        "Scripts only; matching approved recordings are required before delivery.",
      href: "/dashboard/campaigns",
    };
  return {
    contact: identity,
    ...action,
    scope:
      action.kind === "voice_script"
        ? "New text draft only; no synthesis or approved audio replacement."
        : "Requires explicit save approval; no communications.",
  };
}
export async function prepareAction(
  owner: string,
  raw: unknown,
  options: { revisionOf?: string; meterDraft?: boolean } = {},
): Promise<Proposal> {
  const action = ActionSchema.parse(raw),
    preview = await actionPreview(owner, action);
  const id = crypto.randomUUID(),
    createdAt = new Date().toISOString(),
    expiresAt = new Date(Date.now() + 30 * 60000).toISOString();
  const parent = options.revisionOf
    ? await getProposal(owner, options.revisionOf)
    : null;
  if (
    parent &&
    (await proposalOutcome(owner, parent.id))?.state === "completed"
  )
    throw new AssistantFailure(
      "This proposal is already saved. Open its CRM record editor for changes; a new proposal must not silently duplicate or move it.",
      409,
    );
  if (parent && parent.action.kind !== action.kind)
    throw new AssistantFailure(
      "A revision must preserve the original action type",
      400,
    );
  const proposal: Proposal = {
    id,
    rootId: parent?.rootId ?? parent?.id ?? id,
    action,
    preview,
    createdAt,
    expiresAt,
    digest: digest({ action, preview }),
    executable:
      [
        "task",
        "note",
        "calendar",
        "campaign",
        "voice_script",
        "flyer",
        "financing",
        "checklist",
        "property_preferences",
      ].includes(action.kind) ||
      (["sms", "email"].includes(action.kind) &&
        preview.sendingSupported === true),
  };
  if (!proposal.executable)
    proposal.limitation = ["sms", "email"].includes(action.kind)
      ? "Draft only. Use the existing authorized campaign delivery workflow."
      : "Prepared preview only; no record change or sharing is authorized.";
  const save = async () => {
    await put(
      owner,
      "proposal",
      id,
      "created",
      proposal as unknown as Record<string, unknown>,
    );
    await advanceProposal(
      owner,
      proposal,
      parent ? "revise" : "create",
      parent?.id,
    );
    return proposal;
  };
  if (options.meterDraft && ["sms", "email"].includes(action.kind))
    return meteredAi(owner, "message_drafts", `draft:${id}`, save);
  if (options.meterDraft && action.kind === "campaign" && !parent)
    return meteredAi(owner, "campaign_drafts", `campaign:${id}`, save);
  return save();
}
export async function assertApproval(
  owner: string,
  id: string,
  expectedDigest: string,
) {
  const p = await getProposal(owner, id);
  const root = await proposalRoot(owner, p);
  if (!root || root.current_proposal_id !== p.id || root.state !== "draft")
    throw new AssistantFailure(
      "Proposal is superseded, claimed, cancelled or requires a fresh preview.",
      409,
    );
  if (p.digest !== expectedDigest)
    throw new AssistantFailure(
      "Proposal changed. Review the exact current preview.",
      409,
    );
  if (Date.parse(p.expiresAt) < Date.now())
    throw new AssistantFailure(
      "Proposal expired. Prepare a fresh preview.",
      409,
    );
  if (!p.executable)
    throw new AssistantFailure(
      "This is a draft/preview only; execution is not supported.",
      400,
    );
  const current = await actionPreview(owner, ActionSchema.parse(p.action));
  if (digest({ action: p.action, preview: current }) !== p.digest)
    throw new AssistantFailure(
      "CRM context changed. Prepare and review a fresh preview.",
      409,
    );
  return p;
}
export async function proposalOutcome(owner: string, id: string) {
  const outcomes = await entries(owner, "outcome", id, 1);
  if (outcomes[0]) return outcomes[0].metadata;
  const p = await getProposal(owner, id),
    root = await proposalRoot(owner, p);
  if (!root)
    return {
      state: "needs_review",
      message:
        "This preview needs current safety controls. Prepare a fresh proposal.",
    };
  if (root.current_proposal_id !== p.id)
    return {
      state: "superseded",
      message:
        "A revised preview replaced this version. No action is available here.",
    };
  if (root.state === "cancelled")
    return { state: "cancelled", message: "Proposal cancelled." };
  if (root.state === "claimed") {
    if (!root.updated_at || Date.now() - Date.parse(root.updated_at) > 120000)
      return {
        state: "needs_review",
        message:
          "Execution has not been confirmed. Reconcile the stored result before any new send.",
      };
    return {
      state: "in_progress",
      message:
        "Execution was claimed. Check the stored result; do not submit another send.",
    };
  }
  return null;
}
// Referenced here to keep all record lookup surfaces owner scoped; business services own execution.
export const readProposalContact = ownedContact;
