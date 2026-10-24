import { advanceProposal } from "./roots";
import { reserveAi, settleAi } from "@/lib/billing/ai/meter";
import { assertApproval, proposalOutcome } from "./proposals";
import { put, AssistantFailure, getProposal } from "./store";
import { assertCanSendChannel } from "@/lib/billing/plan-limits";
import { sendToContact } from "@/lib/providers/dispatch-message";
import { ownedContact } from "./reads";
import { insertContactTask } from "@/lib/tasks/insert-task";
import { createOwnerCalendarEvent } from "@/lib/calendar/create-event";
import { saveVoiceDraft } from "@/lib/voice-studio/drafts-store";
import { PATCH as patchContact } from "@/app/api/contacts/[id]/route";
import { POST as assignChecklist } from "@/app/api/tasks/checklists/route";
import { POST as createNote } from "@/app/api/notes/route";
import { POST as createCampaign } from "@/app/api/campaigns/builder/route";
const localRequest = (path: string, body: unknown) =>
  new Request(`http://myari.internal${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
async function handled(response: Response) {
  const result = await response.json();
  if (!response.ok || result.success === false)
    throw new AssistantFailure(
      "The existing MyARI service could not confirm this save. Review records before trying a new proposal.",
      503,
    );
  return result.data ?? result;
}
/** Only the authenticated approval endpoint calls this function. No model tool can import/execute it. */
export async function executeApproved(
  owner: string,
  id: string,
  digest: string,
  confirmation: "CONFIRM_SAVE" | "CONFIRM_SEND" = "CONFIRM_SAVE",
) {
  const previous = await proposalOutcome(owner, id);
  if (previous) return previous;
  const proposal = await assertApproval(owner, id, digest);
  const external = ["sms", "email"].includes(proposal.action.kind);
  if (confirmation !== (external ? "CONFIRM_SEND" : "CONFIRM_SAVE"))
    throw new AssistantFailure(
      "Explicit approval does not match this action type",
      400,
    );
  const action = proposal.action;
  const capability =
    action.kind === "task" || action.kind === "checklist"
      ? "tasks"
      : action.kind === "calendar"
        ? "calendar_events"
        : null;
  const units =
    action.kind === "checklist"
      ? (proposal.preview.template as { steps: unknown[] }).steps.length
      : 1;
  const reservation = capability
    ? await reserveAi(owner, capability, `record:${id}`, units)
    : null;
  try {
    await advanceProposal(owner, proposal, "claim");
  } catch (e) {
    await settleAi(reservation, false);
    throw e;
  }
  if (
    !(await put(owner, "claim", id, "once", {
      state: "executing",
      digest,
      confirmedAt: new Date().toISOString(),
    }))
  ) {
    await settleAi(reservation, false);
    throw new AssistantFailure(
      "Execution was already claimed. Check history; do not submit a duplicate.",
      409,
    );
  }
  try {
    const a = proposal.action;
    let result: Record<string, unknown>;
    if (a.kind === "sms" || a.kind === "email") {
      const quota = await assertCanSendChannel(owner, a.kind);
      if (!quota.ok) throw new AssistantFailure(quota.error, 403);
      const contact = await ownedContact(owner, a.contactId);
      const r = await sendToContact({
        ownerId: owner,
        contact,
        channel: a.kind,
        campaignId: a.campaignId!,
        recipientId: a.recipientId!,
        body: String(proposal.preview.body),
        subject:
          typeof proposal.preview.subject === "string"
            ? proposal.preview.subject
            : undefined,
        approvedMessage: {
          ownerId: owner,
          contactId: a.contactId,
          campaignId: a.campaignId!,
          recipientId: a.recipientId!,
          to: String(proposal.preview.recipient),
          from: String((proposal.preview.sender as { from: string }).from),
          senderIdentity: String(
            (proposal.preview.sender as { identity: string }).identity,
          ),
          provider: String(proposal.preview.provider),
          body: String(proposal.preview.body),
          subject:
            typeof proposal.preview.subject === "string"
              ? proposal.preview.subject
              : null,
        },
        idempotencyKey: `assistant-${proposal.rootId ?? id}`,
        providerId: a.kind === "sms" ? "twilio" : "resend",
        recordEngagement: true,
      });
      if (
        !r.ok ||
        r.uncertain ||
        r.error ||
        !r.providerMessageId?.trim() ||
        r.status === "mock_sent"
      )
        throw Error();
      result = {
        providerMessageId: r.providerMessageId,
        status: r.status,
        href: `/dashboard/contacts/${a.contactId}`,
        message:
          "Provider accepted the approved message request. Delivery is not yet confirmed.",
      };
    } else if (a.kind === "task") {
      const r = await insertContactTask({
        owner_id: owner,
        contact_id: a.contactId,
        title: a.title,
        due_at: a.dueAt,
        reminder_at: a.dueAt,
        notes: a.notes,
        recurrence: "none",
      });
      if (r.error || !r.data) throw Error();
      result = {
        recordId: r.data.id,
        href: `/dashboard/tasks?taskId=${r.data.id}&contactId=${a.contactId}`,
        message:
          "Task saved in MyARI. No external calendar invitation was sent.",
      };
    } else if (a.kind === "flyer" || a.kind === "financing") {
      await put(owner, "document", id, "saved", {
        kind: a.kind,
        proposalId: id,
        savedAt: new Date().toISOString(),
      });
      result = {
        recordId: id,
        href:
          a.kind === "flyer"
            ? `/api/assistant/flyer?id=${id}&format=pdf`
            : `/api/assistant/document?id=${id}&format=pdf`,
        message:
          "Private draft document saved to Command Center. No document was shared.",
      };
    } else if (a.kind === "checklist") {
      const r = await handled(
        await assignChecklist(
          localRequest("/api/tasks/checklists", {
            id,
            approved: true,
            contactId: a.contactId,
            propertyContactId: a.propertyContactId ?? null,
            template: proposal.preview.template,
            baseDate: a.baseDate,
            closingDate: a.closingDate,
            timezone: a.timeZone,
            assigneeId: owner,
          }),
          undefined,
        ),
      );
      result = {
        recordId: r.transaction.id,
        href: `/dashboard/tasks?tab=checklists&contactId=${a.contactId}`,
        message:
          "Checklist and internal tasks saved. Review contractual deadlines before use.",
      };
    } else if (a.kind === "property_preferences") {
      await handled(
        await patchContact(
          localRequest("/api/contacts/" + a.contactId, {
            preferredArea: a.preferredArea,
            budget: a.budget,
            propertyPreferences: a.propertyPreferences,
          }),
          { params: Promise.resolve({ id: a.contactId }) },
        ),
      );
      result = {
        recordId: a.contactId,
        href: `/dashboard/properties?contactId=${a.contactId}`,
        message: "Displayed buyer search preferences saved.",
      };
    } else if (a.kind === "note") {
      const r = await handled(
        await createNote(
          localRequest("/api/notes", {
            contactId: a.contactId,
            title: a.title,
            body: a.body,
            kind: "note",
          }),
          undefined,
        ),
      );
      result = {
        recordId: r.note.id,
        href: `/dashboard/notes?noteId=${r.note.id}`,
        message: "Contact note saved.",
      };
    } else if (a.kind === "calendar") {
      const r = await createOwnerCalendarEvent({
        ownerId: owner,
        contactId: a.contactId,
        title: a.title,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        timeZone: a.timeZone,
        description: a.description,
        recurrence: "none",
        syncToGoogle: false,
        allowConflict: false,
        clientRequestId: id,
      });
      result = {
        ...r,
        href: "/dashboard/calendar",
        message:
          "Internal MyARI appointment saved. No external event or invitation was created.",
      };
    } else if (a.kind === "voice_script") {
      const r = await saveVoiceDraft(owner, {
        id,
        title: a.title,
        script: a.script,
        category: "Assistant draft",
        archived: false,
        expectedRevision: null,
      });
      result = {
        recordId: r.id,
        href: "/dashboard/voice-scripts",
        message:
          "New text draft saved. No audio generated or approved recording changed.",
      };
    } else if (a.kind === "campaign") {
      const r = await handled(
        await createCampaign(
          localRequest("/api/campaigns/builder", {
            action: "template",
            enrollAllEligible: false,
            campaign: {
              id,
              name: a.name,
              description: a.description,
              audience: a.audience,
              durationDays: a.durationDays,
              provider: "mock",
              goals: [],
              steps: a.steps.map((s, i) => ({
                id: `assistant-${id}-${i}`,
                order: i + 1,
                type: s.type,
                title: s.title,
                description: s.description,
                delayMinutes: (s.day - 1) * 1440,
                dayLabel: `Day ${s.day}`,
                timeLabel: "10:00 AM",
                status: "draft",
              })),
            },
          }),
          undefined,
        ),
      );
      result = {
        recordId: r.campaignId,
        href: `/dashboard/campaigns?edit=${r.campaignId}`,
        message:
          "Separate campaign draft saved. No audience enrolled, activation or delivery.",
      };
    } else throw new AssistantFailure("This proposal cannot execute", 400);
    await settleAi(reservation, true);
    const outcome = {
      state: "completed",
      result,
      completedAt: new Date().toISOString(),
    };
    await put(owner, "outcome", id, "final", outcome);
    return outcome;
  } catch {
    const outcome = {
      state: "needs_review",
      message:
        "The save could not be fully confirmed. It may have partially completed. Review linked CRM records before preparing a new proposal. Automatic retry is disabled to prevent duplicates.",
      href: "/dashboard/activity",
      at: new Date().toISOString(),
    };
    await put(owner, "outcome", id, "final", outcome);
    return outcome;
  }
}
export async function cancelProposal(owner: string, id: string) {
  const proposal = await getProposal(owner, id);
  await advanceProposal(owner, proposal, "cancel");
  if (!(await put(owner, "claim", id, "once", { state: "cancelled" })))
    throw new AssistantFailure(
      "This proposal was already claimed or cancelled",
      409,
    );
  const outcome = {
    state: "cancelled",
    message: "Proposal dismissed. No CRM action executed.",
  };
  await put(owner, "outcome", id, "final", outcome);
  return outcome;
}
