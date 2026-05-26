/**
 * AI prompt scaffolds. Connect to OpenAI/Claude/ElevenLabs/Tavus/HeyGen later
 * by replacing the body of generate() in lib/ai/generate.ts.
 */

export type AiTaskType =
  | "email_writer"
  | "sms_writer"
  | "voicemail_script"
  | "follow_up"
  | "note_summary"
  | "next_best_action"
  | "campaign_idea";

export type AiContext = {
  contactName?: string;
  contactNotes?: string;
  campaignName?: string;
  tone?: "warm" | "professional" | "concise" | "luxury";
  goal?: string;
  language?: string;
};

const TONE_DESCRIPTIONS: Record<NonNullable<AiContext["tone"]>, string> = {
  warm: "warm, friendly, personal",
  professional: "professional and respectful",
  concise: "concise and direct",
  luxury: "elegant, calm, and discreet — fitting luxury real estate",
};

export function systemPromptFor(task: AiTaskType): string {
  switch (task) {
    case "email_writer":
      return "You are VoiceReach AI, drafting a high-touch follow-up email for a luxury CRM. Keep subject lines short. Avoid generic openers.";
    case "sms_writer":
      return "You are VoiceReach AI, drafting a short SMS message (<= 320 characters). Sound human, never spammy.";
    case "voicemail_script":
      return "You are VoiceReach AI, drafting a 25-second ringless voicemail script: greeting, value, gentle ask.";
    case "follow_up":
      return "You are VoiceReach AI, recommending the next best follow-up step for a relationship-first CRM.";
    case "note_summary":
      return "You are VoiceReach AI, summarizing client notes into a 3-bullet timeline-ready entry.";
    case "next_best_action":
      return "You are VoiceReach AI, suggesting the next best action for an agent based on contact engagement.";
    case "campaign_idea":
      return "You are VoiceReach AI, proposing a multi-touch campaign concept with sample steps.";
    default:
      return "You are VoiceReach AI, an elegant relationship-marketing copilot.";
  }
}

export function userPromptFor(task: AiTaskType, ctx: AiContext, brief?: string): string {
  const tone = TONE_DESCRIPTIONS[ctx.tone ?? "warm"];
  const lines = [
    `Tone: ${tone}`,
    ctx.contactName ? `Contact: ${ctx.contactName}` : null,
    ctx.contactNotes ? `Notes: ${ctx.contactNotes}` : null,
    ctx.campaignName ? `Campaign: ${ctx.campaignName}` : null,
    ctx.goal ? `Goal: ${ctx.goal}` : null,
    brief ? `Brief: ${brief}` : null,
  ].filter(Boolean) as string[];

  switch (task) {
    case "email_writer":
      return [...lines, "Return JSON {subject, body}."].join("\n");
    case "sms_writer":
      return [...lines, "Return JSON {body}. No emojis unless tone is 'warm'."].join("\n");
    case "voicemail_script":
      return [...lines, "Return JSON {script}. Target 25 seconds (~60 words)."].join("\n");
    case "note_summary":
      return [...lines, "Summarize into JSON {bullets: string[]} with up to 3 items."].join("\n");
    case "follow_up":
    case "next_best_action":
      return [...lines, "Return JSON {recommendation, reason, suggestedChannel}."].join("\n");
    case "campaign_idea":
      return [
        ...lines,
        "Return JSON {name, description, steps: [{type, title, dayLabel, description}]}",
      ].join("\n");
    default:
      return lines.join("\n");
  }
}
