import type { AiContext, AiTaskType } from "./prompts";
import { systemPromptFor, userPromptFor } from "./prompts";

/**
 * Template generator. Replace the body with OpenAI/Claude when ready:
 *
 *   const response = await fetch("https://api.openai.com/v1/chat/completions", { ... })
 *
 * For now this returns deterministic, on-brand drafts so the UI is fully usable.
 */
export type AiResult = {
  task: AiTaskType;
  output: Record<string, unknown>;
  generatedAt: string;
  provider: string;
};

function pick<T>(arr: T[], seed: string): T {
  const code = Array.from(seed).reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return arr[code % arr.length];
}

async function generateWithClaude(
  task: AiTaskType,
  ctx: AiContext,
  brief?: string,
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5",
      max_tokens: 800,
      system: `${systemPromptFor(task)}\nReturn valid JSON only, no markdown.`,
      messages: [{ role: "user", content: userPromptFor(task, ctx, brief) }],
    }),
  });

  if (!response.ok) {
    console.warn("[ai] Claude request failed", response.status, await response.text().catch(() => ""));
    return null;
  }

  const json = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = json.content?.find((part) => part.type === "text")?.text?.trim();
  if (!text) return null;

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { body: text, message: text };
  }
}

export async function generate(task: AiTaskType, ctx: AiContext, brief?: string): Promise<AiResult> {
  const claudeOutput = await generateWithClaude(task, ctx, brief).catch(() => null);
  if (claudeOutput) {
    return {
      task,
      output: claudeOutput,
      generatedAt: new Date().toISOString(),
      provider: "claude",
    };
  }

  const seed = `${task}-${ctx.contactName ?? "client"}-${ctx.tone ?? "warm"}`;
  const name = ctx.contactName?.split(" ")[0] ?? "there";
  const goal = ctx.goal ?? "deepen the relationship";

  const output: Record<string, unknown> = (() => {
    switch (task) {
      case "email_writer":
        return {
          subject: pick(
            [
              `A quick note for you, ${name}`,
              `Thinking of you — quick update`,
              `${name}, a curated update on your market`,
            ],
            seed,
          ),
          body: [
            `Hi ${name},`,
            "",
            `It was great connecting recently. I wanted to ${goal.toLowerCase()} and share a thoughtful next step that fits where you are right now.`,
            ctx.contactNotes ? `Based on your notes (${ctx.contactNotes.slice(0, 120)}…), a tailored option could be a great fit.` : "",
            "",
            "Would Tuesday or Thursday work for a brief call?",
            "",
            "Warmly,",
            "[Your name]",
          ]
            .filter(Boolean)
            .join("\n"),
        };
      case "sms_writer":
        return {
          body: `Hi ${name} — wanted to check in${ctx.campaignName ? ` after our ${ctx.campaignName} touchpoint` : ""}. Are you open to a quick call this week? — [Your name]`,
        };
      case "voicemail_script":
        return {
          script: [
            `Hi ${name}, it's [Your name] from [Brokerage].`,
            "I was thinking about you today and wanted to drop a quick note — no rush.",
            `If ${goal.toLowerCase()} is on your mind this season, I'd love to share two thoughtful options.`,
            "Give me a call back when it's convenient. Have a great day.",
          ].join(" "),
        };
      case "note_summary":
        return {
          bullets: [
            `Relationship goal: ${goal}.`,
            ctx.contactNotes
              ? `Key context: ${ctx.contactNotes.slice(0, 140)}${ctx.contactNotes.length > 140 ? "…" : ""}.`
              : "Key context: needs initial discovery call.",
            "Next best step: schedule a 15-min relationship check-in within 7 days.",
          ],
        };
      case "follow_up":
      case "next_best_action":
        return {
          recommendation: pick(
            [
              "Send a personalized ringless voicemail",
              "Schedule a 15-min relationship call",
              "Share a curated market update",
              "Send a short SMS with a property suggestion",
            ],
            seed,
          ),
          reason: ctx.contactNotes
            ? "Based on your notes and recent engagement, a warm voice touch is most likely to convert."
            : "Limited recent engagement — a warm, personalized touch tends to outperform email here.",
          suggestedChannel: pick(["voicemail", "sms", "email"], seed),
        };
      case "campaign_idea":
        return {
          name: `Luxury ${ctx.tone === "luxury" ? "discreet" : "warm"} nurture — 10 days`,
          description: "Multi-touch sequence designed to keep you top of mind without overwhelm.",
          steps: [
            { type: "voicemail", title: "Warm intro voicemail", dayLabel: "Day 1", description: "25-sec personal voicemail" },
            { type: "email", title: "Curated market update", dayLabel: "Day 3", description: "Tailored to neighborhood" },
            { type: "avatar_video", title: "Personalized video", dayLabel: "Day 5", description: "AI avatar message" },
            { type: "sms", title: "Light SMS nudge", dayLabel: "Day 7", description: "Single warm message" },
            { type: "callback", title: "Callback reminder", dayLabel: "Day 10", description: "Personal follow-up" },
          ],
        };
      default:
        return { message: "AI infrastructure ready. Connect an LLM provider to enable generation." };
    }
  })();

  return {
    task,
    output: {
      ...output,
      _system: systemPromptFor(task),
      _userPrompt: userPromptFor(task, ctx, brief),
    },
    generatedAt: new Date().toISOString(),
    provider: process.env.ANTHROPIC_API_KEY
      ? "claude (configured)"
      : process.env.OPENAI_API_KEY
        ? "openai (configured)"
        : "template",
  };
}
