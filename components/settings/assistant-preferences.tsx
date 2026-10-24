"use client";
import { AiUsagePanel } from "@/components/billing/ai-usage";
import {
  AssistantPreferencesSchema,
  type AssistantPreferences,
} from "@/lib/assistant/preferences";
export function AssistantPreferencesFields({
  value,
  onChange,
  partners,
}: {
  value?: AssistantPreferences;
  onChange: (value: AssistantPreferences) => void;
  partners: { id: string; kind: string; name: string }[];
}) {
  const p = AssistantPreferencesSchema.parse(value ?? {});
  const patch = (v: Partial<AssistantPreferences>) => onChange({ ...p, ...v });
  return (
    <details className="reviews-referrals">
      <summary>MyARI Assistant preferences</summary>
      <label>
        Campaign tone
        <select
          value={p.tone}
          onChange={(e) =>
            patch({ tone: e.target.value as AssistantPreferences["tone"] })
          }
        >
          {["warm", "professional", "concise", "luxury"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label>
        Communication style
        <select
          value={p.style}
          onChange={(e) =>
            patch({ style: e.target.value as AssistantPreferences["style"] })
          }
        >
          <option>concise</option>
          <option>detailed</option>
        </select>
      </label>
      <label>
        Conversation recall window
        <select
          value={p.retainDays}
          onChange={(e) =>
            patch({ retainDays: Number(e.target.value) as 7 | 30 | 90 })
          }
        >
          {[7, 30, 90].map((n) => (
            <option key={n} value={n}>
              {n} days
            </option>
          ))}
        </select>
      </label>
      <p>
        Older conversations are excluded from recall. Delete conversation
        messages explicitly in the assistant. Execution and usage audit history
        is separate.
      </p>
      {(["lender", "title"] as const).map((kind) => (
        <label key={kind}>
          Default {kind} partner
          <select
            value={
              (kind === "lender" ? p.defaultLenderId : p.defaultTitleId) ?? ""
            }
            onChange={(e) =>
              patch(
                kind === "lender"
                  ? { defaultLenderId: e.target.value || null }
                  : { defaultTitleId: e.target.value || null },
              )
            }
          >
            <option value="">Select per workflow</option>
            {partners
              .filter((x) => x.kind === kind)
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
          </select>
        </label>
      ))}
      <label>
        <input
          type="checkbox"
          checked={p.notifications}
          onChange={(e) => patch({ notifications: e.target.checked })}
        />
        Prefer assistant in-app notifications when supported
      </label>
      <p>
        Automatic assistant notifications are not enabled by this preference.
        Existing briefing delivery preferences remain in Dashboard.
      </p>
      <label>
        <input
          type="checkbox"
          checked={p.confirmLowRisk}
          onChange={(e) => patch({ confirmLowRisk: e.target.checked })}
        />
        Confirm low-risk draft preparation
      </label>
      <p>
        Every CRM save still requires explicit approval. Sending, activation,
        billing and administrative safeguards cannot be disabled. Voice and
        Brand Kit preferences above apply; timezone uses Profile settings.
      </p>
      <AiUsagePanel />
    </details>
  );
}
