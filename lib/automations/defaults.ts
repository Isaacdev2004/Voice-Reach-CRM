import type { AutomationWorkflow } from "./types";

export const DEFAULT_WORKFLOW: AutomationWorkflow = {
  id: "wf-new-contact-nurture",
  name: "New Contact Nurture",
  description: "Welcome sequence when a contact is added from your website form.",
  status: "draft",
  updatedAt: new Date().toISOString(),
  nodes: [
    {
      id: "n1",
      kind: "trigger",
      title: "New Contact Upload",
      description: "Source: Main Website Form",
      meta: "Last activity: 2m ago",
    },
    {
      id: "n2",
      kind: "action",
      title: "Send Ringless Voicemail",
      description: "File: Welcome_Message_v2.mp3",
      meta: "Retry enabled (3x)",
    },
    {
      id: "n3",
      kind: "delay",
      title: "Wait 24 Hours",
      description: "Until: Next business day",
      meta: "Timezone: UTC-5",
    },
    {
      id: "n4",
      kind: "decision",
      title: "If No Response?",
      description: "Check: Last 24 hours activity",
      decision: {
        yes: { title: "End Workflow", description: "Contact engaged — stop sequence" },
        no: { title: "Send SMS", description: "Concise follow-up text message" },
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
