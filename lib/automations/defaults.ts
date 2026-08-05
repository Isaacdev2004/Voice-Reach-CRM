import type { AutomationWorkflow } from "./types";

export const DEFAULT_WORKFLOW: AutomationWorkflow = {
  id: "wf-cold-lead-reengage",
  name: "Cold Lead Re-engagement",
  description:
    "When a lead goes quiet, start the Cold Lead Re-engagement campaign (voicemail → SMS → email → callback).",
  status: "draft",
  updatedAt: new Date().toISOString(),
  nodes: [
    {
      id: "n1",
      kind: "trigger",
      title: "Lead inactive",
      description: "No opens, replies, or listens for 14+ days",
      meta: "Trigger: lead_inactive",
    },
    {
      id: "n2",
      kind: "action",
      title: "Start campaign",
      description: "Cold Lead Re-engagement sequence",
      meta: "Action: start_campaign",
    },
    {
      id: "n3",
      kind: "delay",
      title: "Wait 48 hours",
      description: "Give the first voicemail + SMS time to land",
      meta: "Timezone: local",
    },
    {
      id: "n4",
      kind: "decision",
      title: "If they reply or listen?",
      description: "Check engagement after first touches",
      decision: {
        yes: { title: "Notify agent", description: "Create callback task — personal follow-up" },
        no: { title: "Continue sequence", description: "Let email + Day 6 SMS run" },
      },
    },
  ],
};

export const NODE_KIND_OPTIONS = [
  {
    kind: "trigger" as const,
    label: "Trigger",
    icon: "person_add",
    description: "Starts the workflow when an event occurs",
    defaultTitle: "New trigger",
    defaultDescription: "When a contact is added",
  },
  {
    kind: "action" as const,
    label: "Action",
    icon: "bolt",
    description: "Send voicemail, email, SMS, or video",
    defaultTitle: "Send message",
    defaultDescription: "Configure channel and content",
  },
  {
    kind: "delay" as const,
    label: "Delay",
    icon: "schedule",
    description: "Wait before the next step",
    defaultTitle: "Wait",
    defaultDescription: "24 hours",
  },
  {
    kind: "decision" as const,
    label: "Decision",
    icon: "call_split",
    description: "Branch based on engagement",
    defaultTitle: "If condition?",
    defaultDescription: "Check recent activity",
  },
];
