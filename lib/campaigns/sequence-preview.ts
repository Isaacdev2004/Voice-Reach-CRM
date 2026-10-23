import { renderMessage } from "./render-message";
import { scheduledAtForStep } from "./scheduling";
import type { MergeFieldContext } from "./merge-fields";
export type PreviewStep = {
  id: string;
  type: string;
  title: string;
  description?: string;
  delay_minutes?: number;
  time_label?: string;
  step_order?: number;
};
/** Pure preview: exactly the renderer used at the send boundary. No provider, enrollment, consent or queue calls. */
export function previewSequence(
  steps: PreviewStep[],
  context: MergeFieldContext,
  anchor = new Date().toISOString(),
) {
  return [...steps]
    .sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))
    .map((step) => {
      const outgoing = ["sms", "email", "voicemail"].includes(step.type);
      const rendered = outgoing
        ? renderMessage(
            step.type as "sms" | "email" | "voicemail",
            step.description ?? "",
            step.title,
            context,
          )
        : {
            ok: !["avatar_video", "retargeting"].includes(step.type),
            body: "",
            subject: null,
            issues: ["avatar_video", "retargeting"].includes(step.type)
              ? ["No delivery integration is configured for this channel."]
              : [],
          };
      let scheduledAt: string | null = null;
      const issues = [...rendered.issues];
      try {
        scheduledAt = scheduledAtForStep(
          step,
          anchor,
          context.timezone ?? "America/New_York",
        ).toISOString();
      } catch {
        issues.push("Review this step’s send time and timezone.");
      }
      return {
        stepId: step.id,
        channel: step.type,
        title: step.title,
        ...rendered,
        ok: rendered.ok && !issues.length,
        issues,
        scheduledAt,
        notice:
          step.type === "voicemail"
            ? "Text is a script preview. Recorded audio must be reviewed separately."
            : outgoing
              ? "Content preview only. Consent, quiet hours and authorization are rechecked at delivery."
              : "Internal action; not a subscriber message.",
      };
    });
}
