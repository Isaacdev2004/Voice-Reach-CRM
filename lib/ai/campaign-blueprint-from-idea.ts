import { parseDayNumber } from "@/lib/crm/campaign-steps";
import type { CampaignStepType } from "@/lib/crm/types";

export type AiCampaignBlueprint = {
  id: string;
  name: string;
  description: string;
  audience: string;
  durationDays: number;
  steps: Array<{
    id: string;
    order: number;
    type: CampaignStepType;
    title: string;
    description: string;
    dayLabel: string;
    timeLabel: string;
    status: "draft";
  }>;
  goals: string[];
  provider: string;
};

const TYPE_ALIASES: Record<string, CampaignStepType> = {
  email: "email",
  mail: "email",
  sms: "sms",
  text: "sms",
  voicemail: "voicemail",
  vm: "voicemail",
  rvm: "voicemail",
  video: "avatar_video",
  avatar_video: "avatar_video",
  avatar: "avatar_video",
  task: "task",
  callback: "callback",
  wait: "wait",
  retargeting: "retargeting",
};

function normalizeStepType(raw: unknown): CampaignStepType {
  const key = String(raw ?? "email")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return TYPE_ALIASES[key] ?? "email";
}

function newStepId(order: number): string {
  return `ai-step-${order}-${crypto.randomUUID().slice(0, 8)}`;
}

/**
 * Maps validated `campaign_idea` AI output into a campaign builder blueprint (draft).
 */
export function campaignBlueprintFromAiIdea(
  output: Record<string, unknown>,
): AiCampaignBlueprint | null {
  const name = typeof output.name === "string" ? output.name.trim() : "";
  if (!name) return null;
  const description =
    typeof output.description === "string" ? output.description.trim() : "";
  const rawSteps = Array.isArray(output.steps) ? output.steps : [];
  if (
    rawSteps.length === 0 ||
    rawSteps.some(
      (raw) =>
        !raw ||
        typeof raw !== "object" ||
        !TYPE_ALIASES[
          String((raw as Record<string, unknown>).type ?? "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "_")
        ] ||
        typeof (raw as Record<string, unknown>).description !== "string",
    )
  )
    return null;

  const steps = rawSteps.map((raw, index) => {
    const step = raw as Record<string, unknown>;
    const order = index + 1;
    const dayLabel =
      typeof step.dayLabel === "string" && step.dayLabel.trim()
        ? step.dayLabel.trim()
        : `Day ${order}`;
    return {
      id: newStepId(order),
      order,
      type: normalizeStepType(step.type),
      title:
        typeof step.title === "string" ? step.title.trim() : `Step ${order}`,
      description: String(step.description ?? "").trim(),
      dayLabel,
      timeLabel: "9:00 AM",
      status: "draft" as const,
    };
  });

  const durationDays = Math.max(
    1,
    ...steps.map((s) => parseDayNumber(s.dayLabel)),
  );

  return {
    id: `ai-${crypto.randomUUID()}`,
    name,
    description,
    audience: "From MyARI AI campaign idea",
    durationDays,
    steps,
    goals: ["Review and edit steps before activating"],
    provider: "mock",
  };
}
