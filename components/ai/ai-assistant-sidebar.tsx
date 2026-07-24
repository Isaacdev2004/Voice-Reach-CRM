"use client";

import { Modal, ModalFooterActions } from "@/components/crm/modal";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import { useEffect, useState } from "react";
import { useAiAssistant, type AiTaskType } from "./ai-assistant-context";

const TASKS: { id: AiTaskType; label: string; description: string }[] = [
  {
    id: "follow_up",
    label: "Next best action",
    description: "Best next touchpoint",
  },
  { id: "email_writer", label: "Email writer", description: "On-brand email draft" },
  { id: "sms_writer", label: "SMS writer", description: "Short warm message" },
  {
    id: "voicemail_script",
    label: "Voicemail script",
    description: "25-second script",
  },
  { id: "note_summary", label: "Note summary", description: "3-bullet summary" },
  { id: "campaign_idea", label: "Campaign idea", description: "Multi-touch sequence" },
  {
    id: "next_best_action",
    label: "Smart suggestion",
    description: "Channel + reason",
  },
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
  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>(state.context.tone ?? "luxury");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state.open) {
      setResult(null);
      setError(null);
      setTone(state.context.tone ?? "luxury");
    }
  }, [state.open, state.task, state.context.tone]);

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
    try {
      await navigator.clipboard.writeText(renderableText(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <Modal
      open={state.open}
      onClose={closeAssistant}
      title="ARI AI"
      description="Relationship copilot — pick a task and generate a draft."
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={closeAssistant}
          cancelLabel="Close"
          primaryLabel={loading ? "Generating…" : "Generate"}
          onPrimary={() => void run()}
          primaryDisabled={loading}
          primaryLoading={loading}
        />
      }
    >
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
            Choose a task
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TASKS.map((t) => {
              const active = t.id === state.task;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTask(t.id)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-left transition-all",
                    active
                      ? "border-rose-gold/60 bg-champagne shadow-sm"
                      : "border-outline-variant/15 hover:border-rose-gold/30",
                  )}
                >
                  <p className="text-[13px] font-medium text-ink">{t.label}</p>
                  <p className="mt-0.5 text-[11px] text-taupe">{t.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">Tone</p>
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
        </div>

        {state.context.contactName ? (
          <p className="rounded-xl bg-champagne/40 px-3 py-2 text-[12px] text-taupe">
            Context: <span className="font-medium text-ink">{state.context.contactName}</span>
          </p>
        ) : null}

        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
            Brief (optional)
          </label>
          <textarea
            value={state.brief ?? ""}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder="E.g. The client just toured a new listing — follow up gently."
            className="mt-2 w-full rounded-xl border border-outline-variant/30 bg-ivory px-3 py-2 text-[14px] outline-none focus:border-rose-gold"
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}

        {result ? (
          <div className="rounded-2xl border border-outline-variant/15 bg-cream p-4">
            <div className="mb-2 flex items-center justify-between">
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
          </div>
        ) : null}
      </div>
    </Modal>
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
