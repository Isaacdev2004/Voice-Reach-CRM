"use client";

import type { ReactNode } from "react";
import { CampaignIdeaActions } from "@/components/ai/campaign-idea-actions";
import type { AiTaskType } from "./ai-assistant-context";

type AiResultPanelProps = {
  task: AiTaskType;
  output: Record<string, unknown>;
  contactId?: string;
};

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-taupe">{children}</p>
  );
}

export function AiResultPanel({ task, output, contactId }: AiResultPanelProps) {
  switch (task) {
    case "email_writer":
      return (
        <div className="space-y-4">
          <div>
            <FieldLabel>Subject</FieldLabel>
            <p className="mt-1.5 font-medium text-ink">{String(output.subject ?? "")}</p>
          </div>
          <div>
            <FieldLabel>Email draft</FieldLabel>
            <p className="mt-1.5 whitespace-pre-wrap font-serif text-[14px] leading-relaxed text-ink">
              {String(output.body ?? "")}
            </p>
          </div>
        </div>
      );
    case "sms_writer":
      return (
        <div>
          <FieldLabel>SMS draft</FieldLabel>
          <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">
            {String(output.body ?? "")}
          </p>
        </div>
      );
    case "voicemail_script":
      return (
        <div>
          <FieldLabel>Voicemail script</FieldLabel>
          <p className="mt-1.5 whitespace-pre-wrap font-serif text-[14px] leading-relaxed text-ink">
            {String(output.script ?? "")}
          </p>
        </div>
      );
    case "follow_up":
    case "next_best_action":
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Recommendation</FieldLabel>
            <p className="mt-1.5 text-[14px] font-medium text-ink">{String(output.recommendation ?? "")}</p>
          </div>
          {output.reason ? (
            <div>
              <FieldLabel>Why</FieldLabel>
              <p className="mt-1.5 text-[14px] leading-relaxed text-slate-text">
                {String(output.reason)}
              </p>
            </div>
          ) : null}
          {output.suggestedChannel ? (
            <div>
              <FieldLabel>Suggested channel</FieldLabel>
              <p className="mt-1.5 text-[14px] text-ink">{String(output.suggestedChannel)}</p>
            </div>
          ) : null}
        </div>
      );
    case "note_summary": {
      const bullets = Array.isArray(output.bullets) ? (output.bullets as unknown[]) : [];
      return (
        <div>
          <FieldLabel>Summary</FieldLabel>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-ink">
            {bullets.map((b, i) => (
              <li key={i}>{String(b)}</li>
            ))}
          </ul>
        </div>
      );
    }
    case "campaign_idea": {
      const steps = Array.isArray(output.steps) ? (output.steps as Array<Record<string, unknown>>) : [];
      return (
        <div className="space-y-3">
          <div>
            <FieldLabel>Campaign</FieldLabel>
            <p className="mt-1.5 font-medium text-ink">{String(output.name ?? "")}</p>
            {output.description ? (
              <p className="mt-1 text-[13px] text-slate-text">{String(output.description)}</p>
            ) : null}
          </div>
          {steps.length > 0 ? (
            <ol className="list-decimal space-y-2 pl-5 text-[13px] text-ink">
              {steps.map((s, i) => (
                <li key={i}>
                  <span className="font-medium">{String(s.title ?? "Step")}</span>
                  {s.dayLabel ? (
                    <span className="text-taupe"> · {String(s.dayLabel)}</span>
                  ) : null}
                  {s.description ? (
                    <p className="text-slate-text">{String(s.description)}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
          <CampaignIdeaActions output={output} contactId={contactId} />
        </div>
      );
    }
    default:
      return (
        <p className="text-[14px] text-slate-text">
          We couldn&apos;t display this result. Try generating again.
        </p>
      );
  }
}
