"use client";

import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";
import { useAiAssistant, type AiTaskType } from "./ai-assistant-context";

const TASKS: { id: AiTaskType; label: string; icon: string; description: string }[] = [
  { id: "follow_up", label: "Next best action", icon: "auto_awesome", description: "AI suggests the best next touchpoint." },
  { id: "email_writer", label: "Email writer", icon: "mail", description: "Draft a luxury, on-brand email." },
  { id: "sms_writer", label: "SMS writer", icon: "sms", description: "Short, warm SMS messages." },
  { id: "voicemail_script", label: "Voicemail script", icon: "voicemail", description: "Personalized 25-second script." },
  { id: "note_summary", label: "Note summary", icon: "edit_note", description: "3-bullet client summary." },
  { id: "campaign_idea", label: "Campaign idea", icon: "campaign", description: "Multi-touch sequence concept." },
  { id: "next_best_action", label: "Smart suggestion", icon: "bolt", description: "Recommend a channel + reason." },
];

const TONES: { id: "warm" | "professional" | "concise" | "luxury"; label: string }[] = [
  { id: "luxury", label: "Luxury" },
  { id: "warm", label: "Warm" },
  { id: "professional", label: "Professional" },
  { id: "concise", label: "Concise" },
];

export function AiAssistantSidebar() {
  const { state, closeAssistant, setBrief, setTask } = useAiAssistant();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<typeof TONES[number]["id"]>(state.context.tone ?? "luxury");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.open) {
      setResult(null);
      setError(null);
    }
  }, [state.open, state.task]);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    const envelope = await safeFetch<{
      output: Record<string, unknown>;
      provider: string;
    }>("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: state.task,
        brief: state.brief,
        context: { ...state.context, tone },
      }),
    });
    setLoading(false);
    if (!envelope.success) {
      setError(envelope.error);
      return;
    }
    setResult(envelope.data?.output ?? null);
  };

  const copyOutput = async () => {
    if (!result) return;
    const text = renderableText(result);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {state.open ? (
        <div
          className="fixed inset-0 z-[140] bg-ink/30 backdrop-blur-sm transition-opacity"
          onClick={closeAssistant}
          aria-hidden
        />
      ) : null}
      <aside
        className={cn(
          "fixed right-0 top-0 z-[150] flex h-full w-full max-w-md flex-col border-l border-outline-variant/15 bg-ivory shadow-card transition-transform duration-300",
          state.open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!state.open}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-outline-variant/10 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-gold/15 text-rose-gold-deep">
              <Icon name="auto_awesome" />
            </div>
            <div>
              <p className="font-serif text-[18px] font-semibold text-ink">VoiceReach AI</p>
              <p className="text-[12px] text-taupe">Relationship copilot</p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeAssistant}
            className="rounded-full p-1.5 text-taupe hover:bg-champagne"
            aria-label="Close AI assistant"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">Choose a task</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {TASKS.map((t) => {
              const active = t.id === state.task;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTask(t.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-rose-gold/60 bg-champagne shadow-sm"
                      : "border-outline-variant/15 hover:border-rose-gold/30",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon name={t.icon} className="text-[18px] text-rose-gold-deep" />
                    <p className="text-[13px] font-medium text-ink">{t.label}</p>
                  </div>
                  <p className="mt-1 text-[11px] text-taupe">{t.description}</p>
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">Tone</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors",
                  tone === t.id
                    ? "border-rose-gold bg-rose-gold/15 text-rose-gold-deep"
                    : "border-outline-variant/30 text-taupe hover:bg-cream",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {state.context.contactName ? (
            <div className="mt-5 rounded-xl bg-champagne/40 px-3 py-2 text-[12px] text-taupe">
              Context: <span className="font-medium text-ink">{state.context.contactName}</span>
              {state.context.campaignName ? ` · ${state.context.campaignName}` : ""}
            </div>
          ) : null}

          <label className="mt-5 block text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
            Brief (optional)
          </label>
          <textarea
            value={state.brief ?? ""}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder="E.g. The client just toured a new listing — follow up gently."
            className="mt-1 w-full rounded-xl border border-outline-variant/30 bg-ivory px-3 py-2 text-[14px] outline-none focus:border-rose-gold"
          />

          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-gold py-3 text-[14px] font-medium text-ivory transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {loading ? (
              <>
                <Icon name="progress_activity" className="animate-spin text-[18px]" /> Generating…
              </>
            ) : (
              <>
                <Icon name="auto_awesome" /> Generate
              </>
            )}
          </button>

          {error ? (
            <p className="mt-3 rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-[13px] text-error">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="mt-5 rounded-2xl border border-outline-variant/15 bg-cream p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-taupe">
                  Suggestion
                </p>
                <button
                  type="button"
                  onClick={() => void copyOutput()}
                  className="text-[12px] font-medium text-rose-gold-deep hover:underline"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap font-serif text-[14px] leading-relaxed text-ink">
                {renderableText(result)}
              </pre>
              <p className="mt-3 text-[11px] text-taupe">
                AI infrastructure ready — connect OpenAI/Claude to unlock live generation.
              </p>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function renderableText(output: Record<string, unknown>): string {
  if (typeof output.subject === "string" || typeof output.body === "string") {
    const lines: string[] = [];
    if (typeof output.subject === "string") lines.push(`Subject: ${output.subject}`);
    if (typeof output.body === "string") lines.push("", output.body);
    return lines.join("\n");
  }
  if (typeof output.script === "string") return output.script;
  if (Array.isArray(output.bullets)) {
    return (output.bullets as unknown[]).map((b) => `• ${String(b)}`).join("\n");
  }
  if (typeof output.recommendation === "string") {
    return [
      `Recommendation: ${output.recommendation}`,
      output.reason ? `Why: ${output.reason}` : "",
      output.suggestedChannel ? `Channel: ${output.suggestedChannel}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }
  if (typeof output.name === "string" && Array.isArray(output.steps)) {
    const steps = (output.steps as Array<Record<string, unknown>>)
      .map((s, i) => `${i + 1}. [${s.type ?? "step"}] ${s.title ?? ""} — ${s.dayLabel ?? ""}`)
      .join("\n");
    return `${output.name}\n${output.description ?? ""}\n\n${steps}`;
  }
  return JSON.stringify(output, null, 2);
}
