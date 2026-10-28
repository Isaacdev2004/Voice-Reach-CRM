/** Presentation only: all reads/actions still pass through the existing server tools. */
export const workspaceActions = [
  {
    id: "briefing",
    icon: "✧",
    title: "Inbox briefing",
    detail: "Verified replies and follow-ups",
    prompt:
      "Read my daily briefing and unanswered replies. Summarize only verified records and explain missing coverage.",
  },
  {
    id: "campaign",
    icon: "↗",
    title: "Create a campaign",
    detail: "Review a new sequence",
    prompt:
      "Prepare a reviewable 21-day cold buyer follow-up campaign. Save nothing until I approve the exact draft. Do not enroll or send.",
  },
  {
    id: "message",
    icon: "✉",
    title: "Write a message",
    detail: "SMS, email or voicemail draft",
    prompt:
      "Help me draft a warm follow-up message. Ask which authorized contact and channel before preparing it. Do not send.",
  },
  {
    id: "flyer",
    icon: "▧",
    title: "Generate a flyer",
    detail: "From a saved property and Brand Kit",
    prompt:
      "Help prepare a flyer using a saved authorized property and my approved Brand Kit. Ask me to select the property first. Do not invent listing facts or prices.",
  },
  {
    id: "day",
    icon: "◷",
    title: "Plan my day",
    detail: "Tasks and calendar priorities",
    prompt:
      "Read my current tasks and today's calendar. Summarize verified priorities, explain external calendar coverage, and propose changes only for review.",
  },
  {
    id: "pipeline",
    icon: "▥",
    title: "Analyze my pipeline",
    detail: "Recorded opportunities and next steps",
    prompt:
      "Find opportunities in my authorized CRM and summarize recorded pipeline insights. Do not invent metrics or client intentions.",
  },
  {
    id: "search",
    icon: "⌕",
    title: "Search my CRM",
    detail: "Find authorized contacts",
    prompt:
      "Help me search my authorized CRM contacts. Ask for a name or search phrase before searching.",
  },
  {
    id: "organize",
    icon: "≡",
    title: "Summarize and organize",
    detail: "Notes, tasks and next steps",
    prompt:
      "Help summarize my authorized notes. Ask which contact or topic, retrieve the source notes, then propose next steps without saving.",
  },
  {
    id: "referral",
    icon: "♡",
    title: "Past-client relationships",
    detail: "Referrals and authentic reviews",
    prompt:
      "Prepare a warm past-client referral and review campaign for review. Use appreciation, natural check-ins and optional honest review invitations. Ask for my own verified review destination; never assume a shared review link, incentivize reviews or request only positive reviews. No enrollment or sending.",
  },
] as const;
/** Four primary starters; secondary tools remain in the compact tools menu. */
export const primaryWorkspaceActions = [
  "campaign",
  "message",
  "day",
  "pipeline",
].map((id) => {
  const action = workspaceActions.find((a) => a.id === id)!;
  return {
    ...action,
    detail:
      id === "campaign"
        ? "Build a follow-up sequence"
        : id === "pipeline"
          ? "Find opportunities and next steps"
          : action.detail,
  };
});
export const popularPrompts = [
  {
    label: "Create a buyer follow-up campaign",
    message:
      "Create a reviewable buyer follow-up campaign. Ask for any missing details. Do not save, enroll or send until explicitly approved.",
  },
  {
    label: "Write a seller update email",
    message:
      "Help draft a seller update email using verified authorized CRM information. Ask which seller and listing first. Do not send.",
  },
  {
    label: "Generate a flyer for my listing",
    message:
      "Help prepare a flyer using my saved authorized listing and Brand Kit. Ask which listing; do not invent facts or promise a downloadable or editable flyer unless the available tools support it.",
  },
  {
    label: "Show me my most active leads",
    message:
      "Search my authorized CRM for leads with recorded recent activity. Explain the evidence and missing coverage; do not invent engagement scores.",
  },
  {
    label: "Plan my day for this week",
    message:
      "Read my authorized tasks and calendar for this week and suggest priorities. Explain missing external calendar coverage. Propose changes for review only.",
  },
  {
    label: "Give me market stats for Apopka",
    message:
      "Can you provide current market statistics for Apopka using verified dated sources? If live market data is unavailable, state that clearly and do not fabricate statistics.",
  },
] as const;
export type WorkspaceMode = "workspace" | "overlay";
export const conversationPointerKey = (owner: string) =>
  `myari:assistant:conversation:${owner}`;
export function conversationId(value: string | null) {
  return value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : null;
}
export function recentConversations<
  T extends { conversationId: string; message: string; at: string },
>(rows: T[]) {
  return Array.from(
    new Map(
      [...rows].reverse().map((row) => [row.conversationId, row]),
    ).values(),
  ).sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
