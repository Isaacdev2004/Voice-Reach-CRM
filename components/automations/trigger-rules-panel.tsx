"use client";

import { Modal, ModalField, ModalFooterActions, modalInputClass, modalLabelClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useState } from "react";

type TriggerType =
  | "contact_added"
  | "voicemail_listened"
  | "email_opened"
  | "sms_replied"
  | "callback_received"
  | "tag_added"
  | "lead_inactive"
  | "engagement_score"
  | "manual";

type ActionType =
  | "send_sms"
  | "send_email"
  | "notify_user"
  | "assign_task"
  | "start_campaign"
  | "trigger_ai_follow_up"
  | "add_tag";

type Rule = {
  id: string;
  name: string;
  description: string;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown>;
  actions: { type: ActionType; config: Record<string, unknown> }[];
  enabled: boolean;
};

const TRIGGER_LABELS: Record<TriggerType, { label: string; icon: string }> = {
  contact_added: { label: "Contact added", icon: "person_add" },
  voicemail_listened: { label: "Voicemail listened", icon: "voicemail" },
  email_opened: { label: "Email opened", icon: "drafts" },
  sms_replied: { label: "SMS replied", icon: "reply" },
  callback_received: { label: "Callback received", icon: "phone_callback" },
  tag_added: { label: "Tag added", icon: "label" },
  lead_inactive: { label: "Lead inactive", icon: "schedule" },
  engagement_score: { label: "Engagement score threshold", icon: "trending_up" },
  manual: { label: "Manual / on-demand", icon: "play_arrow" },
};

const ACTION_LABELS: Record<ActionType, { label: string; icon: string }> = {
  send_sms: { label: "Send SMS", icon: "sms" },
  send_email: { label: "Send email", icon: "mail" },
  notify_user: { label: "Notify me", icon: "notifications_active" },
  assign_task: { label: "Assign task", icon: "task_alt" },
  start_campaign: { label: "Start campaign", icon: "campaign" },
  trigger_ai_follow_up: { label: "AI follow-up", icon: "auto_awesome" },
  add_tag: { label: "Add tag", icon: "label" },
};

export function TriggerRulesPanel() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const envelope = await safeFetch<{ rules: Rule[] }>("/api/automations/rules");
    setLoading(false);
    if (envelope.success) setRules(envelope.data.rules);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async (rule: Partial<Rule> & { name: string }) => {
    const envelope = await safeFetch("/api/automations/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editing?.id,
        name: rule.name,
        description: rule.description ?? "",
        trigger_type: rule.trigger_type ?? "contact_added",
        trigger_config: rule.trigger_config ?? {},
        actions: rule.actions ?? [{ type: "notify_user", config: {} }],
        enabled: rule.enabled ?? true,
      }),
    });
    if (envelope.success) {
      setModalOpen(false);
      setEditing(null);
      void refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this trigger rule?")) return;
    const envelope = await safeFetch(`/api/automations/rules?id=${id}`, { method: "DELETE" });
    if (envelope.success) void refresh();
  };

  const toggleEnabled = async (rule: Rule) => {
    await safeFetch("/api/automations/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...rule, enabled: !rule.enabled }),
    });
    void refresh();
  };

  return (
    <section className="luxury-card p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
            Automation engine
          </p>
          <h2 className="mt-1 font-serif text-[22px] font-semibold text-ink">Trigger rules</h2>
          <p className="mt-1 text-[13px] text-slate-text">
            When something happens → automatically run actions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-4 py-2 text-[13px] font-medium text-ivory transition-opacity hover:opacity-95"
        >
          <Icon name="add" />
          New rule
        </button>
      </div>

      {loading ? (
        <p className="py-6 text-center text-[13px] text-taupe">Loading rules…</p>
      ) : rules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant/30 bg-cream/40 p-6 text-center">
          <Icon name="bolt" className="text-[32px] text-rose-gold-deep" />
          <p className="mt-2 text-[14px] font-medium text-ink">No triggers yet</p>
          <p className="mt-1 text-[13px] text-slate-text">
            Create a rule like &ldquo;When a contact listens to a voicemail → notify me + start a
            follow-up SMS.&rdquo;
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className={cn(
                "rounded-2xl border bg-ivory p-4 transition-all luxury-hover",
                rule.enabled ? "border-outline-variant/15" : "border-outline-variant/10 opacity-70",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-ink">{rule.name}</p>
                    {rule.enabled ? (
                      <span className="rounded-full bg-emerald-muted/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-muted">
                        Active
                      </span>
                    ) : (
                      <span className="rounded-full bg-champagne px-2 py-0.5 text-[10px] font-bold uppercase text-taupe">
                        Paused
                      </span>
                    )}
                  </div>
                  {rule.description ? (
                    <p className="mt-0.5 text-[13px] text-slate-text">{rule.description}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-gold/10 px-2.5 py-1 text-[11px] font-medium text-rose-gold-deep">
                      <Icon
                        name={TRIGGER_LABELS[rule.trigger_type]?.icon ?? "bolt"}
                        className="text-[14px]"
                      />
                      When {TRIGGER_LABELS[rule.trigger_type]?.label ?? rule.trigger_type}
                    </span>
                    <Icon name="arrow_forward" className="text-[16px] text-taupe" />
                    {rule.actions.map((action, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 rounded-full bg-sage-light px-2.5 py-1 text-[11px] font-medium text-emerald-muted"
                      >
                        <Icon
                          name={ACTION_LABELS[action.type]?.icon ?? "bolt"}
                          className="text-[14px]"
                        />
                        {ACTION_LABELS[action.type]?.label ?? action.type}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void toggleEnabled(rule)}
                    className="rounded-full p-2 text-taupe hover:bg-champagne"
                    aria-label={rule.enabled ? "Pause rule" : "Enable rule"}
                    title={rule.enabled ? "Pause" : "Enable"}
                  >
                    <Icon name={rule.enabled ? "pause" : "play_arrow"} className="text-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(rule);
                      setModalOpen(true);
                    }}
                    className="rounded-full p-2 text-taupe hover:bg-champagne"
                    aria-label="Edit rule"
                  >
                    <Icon name="edit" className="text-[18px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(rule.id)}
                    className="rounded-full p-2 text-error hover:bg-error/10"
                    aria-label="Delete rule"
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RuleModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        initial={editing}
        onSave={handleSave}
      />
    </section>
  );
}

function RuleModal({
  open,
  onClose,
  initial,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: Rule | null;
  onSave: (rule: Partial<Rule> & { name: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [triggerType, setTriggerType] = useState<TriggerType>(initial?.trigger_type ?? "contact_added");
  const [actionTypes, setActionTypes] = useState<ActionType[]>(
    initial?.actions.map((a) => a.type) ?? ["notify_user"],
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setDescription(initial?.description ?? "");
      setTriggerType(initial?.trigger_type ?? "contact_added");
      setActionTypes(initial?.actions.map((a) => a.type) ?? ["notify_user"]);
    }
  }, [open, initial]);

  const toggleAction = (type: ActionType) => {
    setActionTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const submit = async () => {
    if (!name.trim() || actionTypes.length === 0) return;
    setSaving(true);
    await onSave({
      name: name.trim(),
      description,
      trigger_type: triggerType,
      actions: actionTypes.map((type) => ({ type, config: {} })),
      enabled: initial?.enabled ?? true,
    });
    setSaving(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Edit trigger rule" : "New trigger rule"}
      description="Set up a When → Then automation that fires whenever the event happens."
      icon="bolt"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={initial ? "Save rule" : "Create rule"}
          onPrimary={() => void submit()}
          primaryLoading={saving}
          primaryDisabled={!name.trim() || actionTypes.length === 0}
        />
      }
    >
      <div className="space-y-5">
        <ModalField label="Rule name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={modalInputClass}
            placeholder="Notify me when a voicemail is listened to"
          />
        </ModalField>

        <ModalField label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={cn(modalInputClass, "h-auto py-3")}
            placeholder="What does this rule do?"
          />
        </ModalField>

        <div>
          <p className={modalLabelClass}>When</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(TRIGGER_LABELS).map(([id, t]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTriggerType(id as TriggerType)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  triggerType === id
                    ? "border-rose-gold bg-champagne"
                    : "border-outline-variant/20 hover:border-rose-gold/30",
                )}
              >
                <Icon name={t.icon} className="text-[18px] text-rose-gold-deep" />
                <p className="mt-1 text-[12px] font-medium text-ink">{t.label}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={modalLabelClass}>Then (pick one or more actions)</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(ACTION_LABELS).map(([id, a]) => {
              const active = actionTypes.includes(id as ActionType);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleAction(id as ActionType)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors",
                    active
                      ? "border-emerald-muted bg-sage-light"
                      : "border-outline-variant/20 hover:border-emerald-muted/30",
                  )}
                >
                  <Icon name={a.icon} className="text-[18px] text-emerald-muted" />
                  <p className="mt-1 text-[12px] font-medium text-ink">{a.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
