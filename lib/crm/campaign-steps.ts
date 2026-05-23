import type { CampaignStep, CampaignStepType } from "./types";

export type StepTypeOption = {
  type: CampaignStepType;
  label: string;
  icon: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultTime: string;
};

export const CAMPAIGN_STEP_TYPES: StepTypeOption[] = [
  {
    type: "voicemail",
    label: "Ringless voicemail",
    icon: "voicemail",
    defaultTitle: "Ringless Voicemail",
    defaultDescription: "Warm introduction with your recorded voice message.",
    defaultTime: "9:00 AM",
  },
  {
    type: "avatar_video",
    label: "AI video message",
    icon: "smart_display",
    defaultTitle: "Personalized Video Message",
    defaultDescription: "AI avatar delivers a tailored message on your behalf.",
    defaultTime: "11:00 AM",
  },
  {
    type: "email",
    label: "Email",
    icon: "mail",
    defaultTitle: "Email",
    defaultDescription: "Beautifully designed, personalized email follow-up.",
    defaultTime: "1:00 PM",
  },
  {
    type: "sms",
    label: "Text message (SMS)",
    icon: "sms",
    defaultTitle: "Text Message",
    defaultDescription: "Concise, high-touch SMS check-in.",
    defaultTime: "10:00 AM",
  },
  {
    type: "retargeting",
    label: "Social retargeting",
    icon: "ads_click",
    defaultTitle: "Social Media Retargeting",
    defaultDescription: "Stay visible with co-branded social touchpoints.",
    defaultTime: "All Day",
  },
  {
    type: "callback",
    label: "Callback reminder",
    icon: "notifications_active",
    defaultTitle: "Callback Alert",
    defaultDescription: "Reminder to personally follow up when engagement peaks.",
    defaultTime: "9:00 AM",
  },
];

export function getStepTypeOption(type: CampaignStepType): StepTypeOption {
  return CAMPAIGN_STEP_TYPES.find((o) => o.type === type) ?? CAMPAIGN_STEP_TYPES[0];
}

export function parseDayNumber(dayLabel: string): number {
  const match = dayLabel.match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 1;
}

export function suggestNextScheduling(steps: CampaignStep[]): { day: number; timeLabel: string } {
  if (steps.length === 0) return { day: 1, timeLabel: "9:00 AM" };
  const last = steps[steps.length - 1];
  const lastDay = parseDayNumber(last.dayLabel);
  return { day: lastDay + 2, timeLabel: last.timeLabel };
}

export function campaignDurationFromSteps(steps: CampaignStep[]): number {
  if (steps.length === 0) return 1;
  return Math.max(...steps.map((s) => parseDayNumber(s.dayLabel)));
}

export function createCampaignStep(
  input: {
    type: CampaignStepType;
    title: string;
    description: string;
    day: number;
    timeLabel: string;
    order: number;
  },
  id?: string,
): CampaignStep {
  return {
    id: id ?? `step-${crypto.randomUUID()}`,
    order: input.order,
    type: input.type,
    title: input.title.trim(),
    description: input.description.trim(),
    dayLabel: `Day ${input.day}`,
    timeLabel: input.timeLabel.trim() || "9:00 AM",
    status: "draft",
  };
}

export function reorderSteps(steps: CampaignStep[]): CampaignStep[] {
  return steps.map((step, index) => ({ ...step, order: index + 1 }));
}
