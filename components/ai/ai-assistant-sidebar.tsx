"use client";

import { Modal, ModalFooterActions } from "@/components/crm/modal";
import { requestAiDraft } from "@/lib/ai/request-draft";
import type { AiResult } from "@/lib/ai/generate";
import { AiGenerationError, AI_ERROR_MESSAGES } from "@/lib/ai/errors";
import { normalizeAiOutput } from "@/lib/ai/parse-output";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useRef, useState } from "react";
import { outputToPlainText } from "@/lib/ai/parse-output";
import { AiResultPanel } from "./ai-result-panel";
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
  const [result, setResult] = useState<AiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<(typeof TONES)[number]["id"]>(state.context.tone ?? "luxury");
  const [copied, setCopied] = useState(false);

  const sequence = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    sequence.current += 1;
    pending.current?.abort();
    pending.current = null;
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  useEffect(() => {
    cancel();
    setLoading(false);
    setResult(null);
    setError(null);
    setCopied(false);
    setTone(state.context.tone ?? "luxury");
    return cancel;
  }, [state.open, state.task, state.context, cancel]);

  const close = () => { cancel(); closeAssistant(); };
  const chooseTask = (task: AiTaskType) => {
    cancel(); setLoading(false); setResult(null); setError(null); setCopied(false); setTask(task);
  };

  const run = async () => {
    cancel();
    const requestSequence = sequence.current;
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true); setError(null); setResult(null); setCopied(false);
    try {
      const draft = await requestAiDraft(state.task, { ...state.context, tone }, state.brief, { signal: controller.signal });
      if (requestSequence === sequence.current) setResult(draft);
    } catch (failure) {
      if (requestSequence === sequence.current) setError(failure instanceof AiGenerationError ? failure.message : AI_ERROR_MESSAGES.unavailable);
    } finally {
      if (requestSequence === sequence.current) { pending.current = null; setLoading(false); }
    }
  };

  const copyOutput = async () => {
    if (!result) return;
    const text = outputToPlainText(result.task, result.output);
    if (!text) { setError("Complete the draft before copying it."); return; }
    const copySequence = sequence.current;
    try {
      await navigator.clipboard.writeText(text);
      if (copySequence !== sequence.current) return;
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      setCopied(true);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      if (copySequence === sequence.current) setError("Copy isn't available. Select the draft text and copy it manually.");
    }
  };

  const canCopy = result ? normalizeAiOutput(result.task, result.output, {}).ok : false;

  return (
    <Modal
      open={state.open}
      onClose={close}
      title="MyARI AI"
      description="Relationship copilot - pick a task and generate a draft."
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={close}
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
                  onClick={() => chooseTask(t.id)}
                  aria-pressed={active}
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
                aria-pressed={tone === t.id}
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
          <label htmlFor="ai-brief" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-taupe">
            Brief (optional)
          </label>
          <textarea
            id="ai-brief"
            maxLength={4000}
            value={state.brief ?? ""}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder="E.g. The client just toured a new listing - follow up gently."
            className="mt-2 w-full rounded-xl border border-outline-variant/30 bg-ivory px-3 py-2 text-[14px] outline-none focus:border-rose-gold"
          />
        </div>

        {error ? (
          <p role="alert" className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}

        {loading ? <p role="status" className="text-[13px] text-taupe">Preparing your draft…</p> : null}
        {result ? (
          <div className="rounded-2xl border border-outline-variant/15 bg-cream p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-taupe">
                {result.task === "email_writer" ? "Email draft" : result.task === "sms_writer" ? "SMS draft" : "Suggestion"}
              </p>
              <button
                type="button"
                onClick={() => void copyOutput()}
                disabled={!canCopy}
                className="text-[12px] font-medium text-rose-gold-deep hover:underline disabled:opacity-50"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            {result.task !== state.task ? <p className="mb-3 text-[12px] text-taupe">Your brief requested a draft, so this result is ready to edit.</p> : null}
            {result.provider === "template" ? <p className="mb-3 text-[12px] text-taupe">Template draft — review and personalize before use.</p> : null}
            <AiResultPanel
              task={result.task as AiTaskType}
              output={result.output}
              onChange={(output) => { setResult({ ...result, output }); setCopied(false); setError(null); }}
              contactId={state.context.contactId}
            />
            {!canCopy ? <p role="status" className="mt-2 text-[12px] text-taupe">Complete the draft fields before copying.</p> : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
