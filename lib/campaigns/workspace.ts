import { CampaignImportSchema } from "./library-transfer";
import type { z } from "zod";
export type WorkspaceDraft = z.infer<typeof CampaignImportSchema>;
export function normalizeWorkspaceSteps(draft: WorkspaceDraft): WorkspaceDraft {
  return {
    ...draft,
    durationDays: Math.max(
      1,
      ...draft.steps.map((s) => Math.floor((s.delayMinutes ?? 0) / 1440) + 1),
    ),
    steps: draft.steps.map((s, i) => ({
      ...s,
      order: i + 1,
      dayLabel: `Day ${Math.floor((s.delayMinutes ?? 0) / 1440) + 1}`,
    })),
  };
}
export function workspaceErrors(draft: WorkspaceDraft): string[] {
  const parsed = CampaignImportSchema.safeParse(draft);
  if (!parsed.success)
    return parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  const errors: string[] = [];
  draft.steps.forEach((s, i) => {
    if (s.order !== i + 1) errors.push(`Step ${i + 1}: invalid order.`);
    if (
      !s.title.trim() ||
      (!["wait"].includes(s.type) && !s.description.trim())
    )
      errors.push(`Step ${i + 1}: title and content are required.`);
    if ((s.delayMinutes ?? 0) < (draft.steps[i - 1]?.delayMinutes ?? 0))
      errors.push(`Step ${i + 1}: timing must follow the previous step.`);
    if (s.type === "email") {
      const email = splitEmail(s.description);
      if (!email.subject.trim() || !email.body.trim())
        errors.push(`Step ${i + 1}: email subject and body are required.`);
    }
  });
  return errors;
}
export function moveWorkspaceStep(
  draft: WorkspaceDraft,
  from: number,
  to: number,
) {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= draft.steps.length ||
    to >= draft.steps.length
  )
    return draft;
  const slots = draft.steps.map((s) => ({
    delayMinutes: s.delayMinutes,
    dayLabel: s.dayLabel,
    timeLabel: s.timeLabel,
  }));
  const steps = [...draft.steps];
  const [moved] = steps.splice(from, 1);
  steps.splice(to, 0, moved);
  // Moving content into a timeline slot preserves chronological timing and each message's metadata.
  return normalizeWorkspaceSteps({
    ...draft,
    steps: steps.map((s, i) => ({ ...s, ...slots[i] })),
  });
}
export function splitEmail(text: string) {
  const match = text.match(/^Subject:[ \t]*([^\r\n]*)(?:\r?\n(?:\r?\n)?|$)/i);
  return match
    ? { subject: match[1], body: text.slice(match[0].length) }
    : { subject: "", body: text };
}
export function emptyWorkspaceDraft(): WorkspaceDraft {
  return {
    name: "Untitled campaign",
    description: "",
    audience: "Selected contacts",
    durationDays: 1,
    goals: [],
    steps: [
      {
        id: crypto.randomUUID(),
        order: 1,
        type: "email",
        title: "Introduction",
        description: "Subject: A thoughtful introduction\n\n",
        delayMinutes: 0,
        dayLabel: "Day 1",
        timeLabel: "10:00 AM",
      },
    ],
  };
}
