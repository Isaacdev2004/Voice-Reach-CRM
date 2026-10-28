"use client";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useAiAssistant } from "@/components/ai/ai-assistant-context";
import { safeFetch } from "@/lib/api-response";
import {
  emptyWorkspaceDraft,
  moveWorkspaceStep,
  normalizeWorkspaceSteps,
  splitEmail,
  workspaceErrors,
  type WorkspaceDraft,
} from "@/lib/campaigns/workspace";
import type { LibraryPreview } from "@/lib/campaigns/library-data";
import { MERGE_FIELD_GUIDE } from "@/lib/campaigns/merge-fields";
import { CampaignVoiceTest } from "@/components/voice-studio/campaign-voice-test";
import "./campaign-editing-workspace.css";
type Snapshot = {
  draft: WorkspaceDraft;
  preview: LibraryPreview;
  version: string;
  unsupportedRules: boolean;
};
export function CampaignEditingWorkspace({
  campaignId,
}: {
  campaignId: string;
}) {
  const { user, isLoaded } = useUser();
  return isLoaded && user ? (
    <OwnedWorkspace key={`${user.id}:${campaignId}`} campaignId={campaignId} />
  ) : (
    <p role="status">Sign in to open your campaign workspace.</p>
  );
}
function OwnedWorkspace({ campaignId }: { campaignId: string }) {
  const router = useRouter(),
    search = useSearchParams(),
    { openAssistant } = useAiAssistant();
  const [draft, setDraft] = useState<WorkspaceDraft | null>(
      campaignId === "new" ? emptyWorkspaceDraft() : null,
    ),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [selected, setSelected] = useState(search.get("step") || ""),
    [panel, setPanel] = useState<"preview" | "overview" | "ai" | null>(null),
    [sequence, setSequence] = useState(false),
    [focus, setFocus] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [confirm, setConfirm] = useState(false),
    [view, setView] = useState("desktop"),
    [uncertain, setUncertain] = useState(false),
    [retry, setRetry] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const original = useRef(""),
    saveId = useRef(""),
    dirty = !!draft && JSON.stringify(draft) !== original.current,
    dragged = useRef<number | null>(null),
    text = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    let active = true;
    saveId.current = crypto.randomUUID();
    if (campaignId === "new") {
      const d = emptyWorkspaceDraft();
      setDraft(d);
      setSelected(d.steps[0].id);
      original.current = JSON.stringify(d);
      return;
    }
    void safeFetch<Snapshot>(
      `/api/campaigns/workspace?id=${encodeURIComponent(campaignId)}`,
    ).then((r) => {
      if (!active) return;
      if (r.success) {
        setDraft(r.data.draft);
        setSnapshot(r.data);
        original.current = JSON.stringify(r.data.draft);
        setSelected((current) =>
          r.data.draft.steps.some((s) => s.id === current)
            ? current
            : r.data.draft.steps[0]?.id || "",
        );
      } else setError(r.error);
    });
    return () => {
      active = false;
    };
  }, [campaignId, retry]);
  useEffect(() => {
    if (!dirty && !saving) return;
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", before);
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a[href]");
      if (
        a &&
        a.getAttribute("href")?.startsWith("/") &&
        !window.confirm(
          "Leave this campaign workspace? Unsaved changes will be discarded.",
        )
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, saving]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel(null);
        setSequence(false);
        setConfirm(false);
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  useEffect(() => {
    if (!confirm) return;
    const dialog = document.querySelector<HTMLElement>(".cw-confirm");
    const buttons = Array.from(
      dialog?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ??
        [],
    );
    buttons[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === buttons[0]) {
          e.preventDefault();
          buttons.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === buttons.at(-1)) {
          e.preventDefault();
          buttons[0]?.focus();
        }
      }
    };
    window.addEventListener("keydown", trap);
    return () => {
      window.removeEventListener("keydown", trap);
      document
        .querySelector<HTMLButtonElement>(".cw-header .cw-primary")
        ?.focus();
    };
  }, [confirm]);
  const index = draft?.steps.findIndex((s) => s.id === selected) ?? -1,
    step = draft?.steps[index],
    errors = draft ? workspaceErrors(draft) : [],
    unsupported = snapshot?.unsupportedRules ?? false;
  function update(change: Partial<NonNullable<typeof step>>) {
    if (!draft || !step) return;
    setDraft(
      normalizeWorkspaceSteps({
        ...draft,
        steps: draft.steps.map((s) =>
          s.id === step.id ? { ...s, ...change } : s,
        ),
      }),
    );
    setNotice("");
  }
  function leave() {
    if (saving) return;
    if (
      dirty &&
      !window.confirm(
        "Leave this campaign workspace? Unsaved changes will be discarded.",
      )
    )
      return;
    router.push(
      `/dashboard/campaigns${campaignId === "new" ? "" : `?selected=${campaignId}&tab=${encodeURIComponent(search.get("tab") || "Sequence")}&step=${encodeURIComponent(selected)}`}`,
    );
  }
  function add() {
    if (!draft) return;
    const s = {
      id: crypto.randomUUID(),
      order: draft.steps.length + 1,
      type: "email" as const,
      title: "New email",
      description: "Subject: \n\n",
      delayMinutes: (draft.steps.at(-1)?.delayMinutes ?? 0) + 1440,
      dayLabel: "",
      timeLabel: "10:00 AM",
    };
    setDraft(normalizeWorkspaceSteps({ ...draft, steps: [...draft.steps, s] }));
    setSelected(s.id);
    setSequence(false);
  }
  function move(from: number, to: number) {
    if (draft) setDraft(moveWorkspaceStep(draft, from, to));
  }
  async function save() {
    if (!draft || errors.length || unsupported || saving || uncertain) return;
    setSaving(true);
    setError("");
    setConfirm(false);
    try {
      const r = await safeFetch<{ campaignId: string }>(
        `/api/campaigns/workspace`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: saveId.current,
            sourceId: campaignId === "new" ? null : campaignId,
            version: snapshot?.version ?? null,
            confirmation: "CREATE_DRAFT_REVISION",
            draft,
          }),
        },
      );
      if (!alive.current) return;
      if (!r.success) {
        if (r.code === "inspect_save") setUncertain(true);
        throw Error(r.error);
      }
      original.current = JSON.stringify(draft);
      setNotice(
        "Draft saved. No contacts enrolled, schedules changed or messages sent.",
      );
      router.replace(
        `/dashboard/campaigns/${r.data.campaignId}/workspace?step=${encodeURIComponent(selected)}`,
      );
    } catch (e) {
      if (!alive.current) return;
      setError(
        e instanceof Error
          ? e.message
          : "Save could not be confirmed. Your draft remains in this workspace.",
      );
    } finally {
      if (alive.current) setSaving(false);
    }
  }
  const email = step ? splitEmail(step.description) : { subject: "", body: "" };
  return (
    <section
      className={`cw-shell ${focus ? "cw-focus" : ""}`}
      aria-label="Campaign workspace"
    >
      <header className="cw-header" inert={confirm}>
        <div>
          <p className="cw-eyebrow">
            CAMPAIGN STUDIO{" "}
            <span>{snapshot?.preview.campaign.status || "Unsaved draft"}</span>
          </p>
          <h1>{draft?.name || "Your campaign workspace"}</h1>
        </div>
        <nav aria-label="Campaign workspace actions" inert={saving}>
          <button onClick={leave}>← Campaigns</button>
          <button
            onClick={() => setPanel(panel === "preview" ? null : "preview")}
            aria-expanded={panel === "preview"}
          >
            Preview
          </button>
          <button
            onClick={() => setPanel(panel === "ai" ? null : "ai")}
            aria-expanded={panel === "ai"}
          >
            Ask MyARI
          </button>
          <details>
            <summary>More</summary>
            <div className="cw-menu">
              <button onClick={() => setFocus(!focus)}>
                {focus ? "Show CRM navigation" : "Focus workspace"}
              </button>
              <button onClick={() => setPanel("overview")}>
                Overview & timeline
              </button>
              {campaignId !== "new" && (
                <button
                  onClick={() => {
                    if (
                      !dirty ||
                      window.confirm(
                        "Discard unsaved changes and open contacts?",
                      )
                    )
                      router.push(
                        `/dashboard/campaigns/${campaignId}?tab=contacts`,
                      );
                  }}
                >
                  Contacts & performance
                </button>
              )}
              <button onClick={() => setPanel("overview")}>
                Duplicate as a new draft
              </button>
            </div>
          </details>
          <button
            className="cw-primary"
            disabled={
              !draft || saving || unsupported || !!errors.length || uncertain
            }
            onClick={() => setConfirm(true)}
          >
            {saving ? "Saving…" : "Save Draft"}
          </button>
        </nav>
      </header>
      {notice && (
        <p role="status" className="cw-notice">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="cw-error">
          {error}{" "}
          {!draft && (
            <button
              onClick={() => {
                setError("");
                setRetry((n) => n + 1);
              }}
            >
              Retry loading
            </button>
          )}
          {uncertain && (
            <p>
              Inspect Campaigns before trying another save. No automatic retry
              occurred.
            </p>
          )}
        </div>
      )}
      {!draft ? (
        <p role="status" className="cw-loading">
          {error
            ? "Campaign unavailable. Choose Campaigns or retry loading."
            : "Loading authorized campaign…"}
        </p>
      ) : (
        <>
          <div className="cw-subbar" inert={confirm || saving}>
            <button
              aria-expanded={sequence}
              onClick={() => setSequence(!sequence)}
            >
              Sequence · {draft.steps.length} steps
            </button>
            <span>
              {dirty ? "Unsaved changes" : "Ready to edit"} ·{" "}
              {snapshot
                ? "Save creates a new draft revision; original stays unchanged."
                : "Saving never enrolls contacts."}
            </span>
          </div>
          <div className="cw-body" inert={confirm || saving}>
            <aside
              className={`cw-sequence ${sequence ? "cw-open" : ""}`}
              aria-label="Campaign sequence"
            >
              <h2>Your sequence</h2>
              <ol>
                {draft.steps.map((s, i) => (
                  <li
                    key={s.id}
                    draggable={!saving}
                    onDragStart={(e) => {
                      dragged.current = i;
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragged.current !== null) move(dragged.current, i);
                      dragged.current = null;
                    }}
                  >
                    <button
                      aria-current={s.id === selected ? "step" : undefined}
                      onClick={() => {
                        setSelected(s.id);
                        setSequence(false);
                      }}
                    >
                      <span className="cw-step-number">{i + 1}</span>
                      <span>
                        <small>
                          {s.type} · Day{" "}
                          {Math.floor((s.delayMinutes ?? 0) / 1440) + 1}
                        </small>
                        <strong>{s.title || "Untitled step"}</strong>
                        <small>
                          {s.timeLabel || "No time label"} ·{" "}
                          {s.description.trim() ? "Draft" : "Needs content"}
                        </small>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
              <button className="cw-add" onClick={add}>
                ＋ Add step
              </button>
              <p>
                Drag steps into timeline slots, or use Move up / Move down. Only
                your unsaved draft changes.
              </p>
            </aside>
            <main className="cw-editor">
              <div className="cw-editor-heading">
                <div>
                  <p className="cw-eyebrow">
                    STEP {index + 1} · {step?.type || "SELECT A STEP"}
                  </p>
                  <h2>{step?.title || "Shape your next connection."}</h2>
                </div>
                <span className="cw-badge">Draft revision</span>
              </div>
              {step ? (
                <>
                  <div className="cw-fields">
                    <label>
                      Step title
                      <input
                        maxLength={300}
                        value={step.title}
                        onChange={(e) => update({ title: e.target.value })}
                      />
                    </label>
                    <label>
                      Channel
                      <select
                        value={step.type}
                        onChange={(e) => {
                          if (
                            step.voiceAssetId ||
                            step.attachments?.length ||
                            step.resourceKey ||
                            step.reviewRequest
                          ) {
                            setError(
                              "This step has linked media or review rules. Add a separate step to change its channel safely.",
                            );
                            return;
                          }
                          update({ type: e.target.value as typeof step.type });
                        }}
                      >
                        {[
                          "email",
                          "sms",
                          "voicemail",
                          ...(!["email", "sms", "voicemail"].includes(step.type)
                            ? [step.type]
                            : []),
                        ].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {step.type === "email" && (
                    <label>
                      Email subject
                      <input
                        value={email.subject}
                        maxLength={500}
                        onChange={(e) =>
                          update({
                            description: `Subject: ${e.target.value}\n\n${email.body}`,
                          })
                        }
                      />
                    </label>
                  )}
                  <label>
                    {step.type === "email"
                      ? "Email body"
                      : step.type === "voicemail"
                        ? "Voicemail script"
                        : "Message content"}
                    <textarea
                      ref={text}
                      className="cw-message-input"
                      aria-label={
                        step.type === "email"
                          ? "Email body"
                          : step.type === "voicemail"
                            ? "Voicemail script"
                            : "Message content"
                      }
                      value={
                        step.type === "email" ? email.body : step.description
                      }
                      maxLength={49000}
                      onChange={(e) =>
                        update({
                          description:
                            step.type === "email"
                              ? `Subject: ${email.subject}\n\n${e.target.value}`
                              : e.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="cw-text-info">
                    <span>
                      {step.type === "email"
                        ? email.body.length
                        : step.description.length}{" "}
                      characters
                      {step.type === "voicemail"
                        ? ` · approximately ${Math.ceil(step.description.trim().split(/\s+/).filter(Boolean).length / 2.3)} seconds spoken`
                        : ""}
                    </span>
                    <button onClick={() => setPanel("preview")}>
                      Preview this message →
                    </button>
                  </div>
                  <details className="cw-merge">
                    <summary>Insert a supported merge field</summary>
                    <div>
                      {MERGE_FIELD_GUIDE.map((f) => (
                        <button
                          title={f.meaning}
                          key={f.token}
                          onClick={() => {
                            const body =
                              step.type === "email"
                                ? email.body
                                : step.description;
                            const at =
                              text.current?.selectionStart ?? body.length;
                            const end = text.current?.selectionEnd ?? at;
                            const next =
                              body.slice(0, at) + f.token + body.slice(end);
                            update({
                              description:
                                step.type === "email"
                                  ? `Subject: ${email.subject}\n\n${next}`
                                  : next,
                            });
                            text.current?.focus();
                          }}
                        >
                          {f.token}
                        </button>
                      ))}
                    </div>
                  </details>
                  <div className="cw-timing">
                    <label>
                      Enrollment-relative day
                      <input
                        type="number"
                        min={1}
                        max={3651}
                        value={Math.floor((step.delayMinutes ?? 0) / 1440) + 1}
                        onChange={(e) => {
                          const day = Number(e.target.value);
                          if (Number.isInteger(day) && day >= 1 && day <= 3651)
                            update({
                              delayMinutes:
                                (day - 1) * 1440 +
                                ((step.delayMinutes ?? 0) % 1440),
                            });
                        }}
                      />
                    </label>
                    <label>
                      Offset within day (minutes)
                      <input
                        type="number"
                        min={0}
                        max={1439}
                        value={(step.delayMinutes ?? 0) % 1440}
                        onChange={(e) => {
                          const m = Number(e.target.value);
                          if (Number.isInteger(m) && m >= 0 && m < 1440)
                            update({
                              delayMinutes:
                                Math.floor((step.delayMinutes ?? 0) / 1440) *
                                  1440 +
                                m,
                            });
                        }}
                      />
                    </label>
                    <label>
                      Existing time label
                      <input
                        value={step.timeLabel || ""}
                        maxLength={100}
                        onChange={(e) => update({ timeLabel: e.target.value })}
                      />
                    </label>
                  </div>
                  <p className="cw-hint">
                    Delays are relative to enrollment. Time labels preserve the
                    existing campaign format; workspace timezone, quiet hours,
                    consent and provider restrictions remain authoritative. This
                    editor does not reschedule enrolled contacts.
                  </p>
                  {step.type === "sms" && (
                    <p className="cw-hint">
                      SMS length is shown before merge-field expansion. Segments
                      depend on encoding and final recipient content; no
                      inaccurate segment count is promised.
                    </p>
                  )}
                  {step.type === "email" && (
                    <p className="cw-hint">
                      Plain-text email editor. Line breaks and merge fields are
                      preserved; rich-text formatting is not supported by the
                      current delivery format.
                    </p>
                  )}
                  {step.type === "voicemail" && (
                    <div className="cw-hint">
                      Existing recording:{" "}
                      {step.voiceAssetId
                        ? "linked and preserved"
                        : "none selected"}
                      . Script edits do not regenerate audio.
                      <CampaignVoiceTest
                        assetId={step.voiceAssetId ?? null}
                        campaignName={draft.name}
                        stepName={step.title}
                      />
                    </div>
                  )}
                  <div className="cw-step-actions">
                    <button
                      disabled={index < 1}
                      onClick={() => move(index, index - 1)}
                    >
                      Move up
                    </button>
                    <button
                      disabled={index === draft.steps.length - 1}
                      onClick={() => move(index, index + 1)}
                    >
                      Move down
                    </button>
                    <button
                      onClick={() => {
                        const copy = {
                          ...structuredClone(step),
                          id: crypto.randomUUID(),
                        };
                        const steps = [...draft.steps];
                        steps.splice(index + 1, 0, copy);
                        setDraft(normalizeWorkspaceSteps({ ...draft, steps }));
                        setSelected(copy.id);
                      }}
                    >
                      Duplicate step
                    </button>
                    <button
                      disabled={draft.steps.length === 1}
                      onClick={() => {
                        if (
                          !window.confirm(
                            "Remove this step from your unsaved revision?",
                          )
                        )
                          return;
                        const steps = draft.steps.filter(
                          (s) => s.id !== selected,
                        );
                        setDraft(normalizeWorkspaceSteps({ ...draft, steps }));
                        setSelected(steps[Math.max(0, index - 1)].id);
                      }}
                    >
                      Remove step
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={add}>Add your first step</button>
              )}
              {errors.length > 0 && (
                <div role="status" className="cw-validation">
                  <h3>Before saving</h3>
                  <ul>
                    {errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {unsupported && (
                <p role="alert">
                  This source contains custom delivery rules. Saving is disabled
                  to avoid losing those rules.
                </p>
              )}
            </main>
            {panel && (
              <aside
                className="cw-context"
                aria-label="Campaign contextual tools"
              >
                <button
                  className="cw-panel-close"
                  aria-label="Close campaign tools"
                  onClick={() => setPanel(null)}
                >
                  ×
                </button>
                {panel === "preview" && step && (
                  <>
                    <p className="cw-eyebrow">MESSAGE PREVIEW · {step.type}</p>
                    <h2>{step.title}</h2>
                    <div className="cw-preview-controls">
                      <button
                        aria-pressed={view === "desktop"}
                        onClick={() => setView("desktop")}
                      >
                        Desktop
                      </button>
                      <button
                        aria-pressed={view === "mobile"}
                        onClick={() => setView("mobile")}
                      >
                        Mobile
                      </button>
                    </div>
                    <article
                      className={`cw-message-preview ${view === "mobile" ? "cw-mobile-preview" : ""}`}
                    >
                      <h3>
                        {step.type === "email"
                          ? email.subject
                          : step.type === "voicemail"
                            ? "Voicemail script"
                            : "Message draft"}
                      </h3>
                      <p>
                        {step.type === "email" ? email.body : step.description}
                      </p>
                    </article>
                    <p className="cw-hint">
                      Unmerged draft preview. Recipient data is not fabricated.
                      No message has been sent.
                    </p>
                  </>
                )}
                {panel === "overview" && (
                  <>
                    <p className="cw-eyebrow">OVERVIEW & TIMELINE</p>
                    <h2>Your campaign, thoughtfully arranged.</h2>
                    <label>
                      Campaign name
                      <input
                        maxLength={200}
                        value={draft.name}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        value={draft.description}
                        onChange={(e) =>
                          setDraft({ ...draft, description: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Intended audience
                      <input
                        value={draft.audience}
                        onChange={(e) =>
                          setDraft({ ...draft, audience: e.target.value })
                        }
                      />
                    </label>
                    <p>
                      {draft.steps.length} steps · {draft.durationDays} days ·{" "}
                      {[...new Set(draft.steps.map((s) => s.type))].join(", ")}
                    </p>
                    <p>
                      Source enrollment:{" "}
                      {snapshot?.preview.campaign.enrollmentCount ?? 0}. New
                      draft enrollment: none.
                    </p>
                    <ol>
                      {draft.steps.map((s, i) => (
                        <li key={s.id}>
                          Day {Math.floor((s.delayMinutes ?? 0) / 1440) + 1} ·{" "}
                          {s.title}{" "}
                          <small>
                            (
                            {i
                              ? Math.max(
                                  0,
                                  (s.delayMinutes ?? 0) -
                                    (draft.steps[i - 1].delayMinutes ?? 0),
                                )
                              : (s.delayMinutes ?? 0)}{" "}
                            minutes after {i ? "previous step" : "enrollment"})
                          </small>
                        </li>
                      ))}
                    </ol>
                    <p>
                      Save Draft creates a separate revision. Existing
                      performance remains on the original campaign; none is
                      invented for this draft.
                    </p>
                  </>
                )}
                {panel === "ai" && (
                  <>
                    <p className="cw-eyebrow">ASK MYARI</p>
                    <h2>A thoughtful second opinion.</h2>
                    <p>
                      AI editing of saved campaigns is not supported by the
                      current approval workflow. MyARI can help draft a separate
                      proposal or message; nothing is applied to this editor
                      automatically.
                    </p>
                    <p>
                      Review suggestions and make manual changes here, then
                      explicitly save your draft revision.
                    </p>
                    <button
                      onClick={() =>
                        openAssistant({
                          brief: `Help me draft suggestions for my authorized campaign ${draft.name}, step ${index + 1}: ${step?.title || ""}. Read only authorized CRM context. Do not modify this saved campaign, enroll contacts or send.`,
                          context: { campaignName: draft.name },
                        })
                      }
                    >
                      Open existing MyARI tools →
                    </button>
                  </>
                )}
              </aside>
            )}
          </div>
          {confirm && (
            <div
              className="cw-confirm"
              role="dialog"
              aria-modal="true"
              aria-label="Confirm draft revision"
            >
              <h2>Save a separate draft?</h2>
              <p>
                {snapshot
                  ? "The original campaign, contacts, schedules and performance remain unchanged."
                  : "A draft will be created without enrollment or sending."}
              </p>
              <button onClick={() => setConfirm(false)}>Keep editing</button>
              <button
                className="cw-primary"
                disabled={saving}
                onClick={() => void save()}
              >
                Confirm Save Draft
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
