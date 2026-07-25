"use client";

import { Modal, ModalFooterActions } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import { useEffect, useMemo, useState } from "react";

type ContactRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
};

type ProviderStatus = {
  configured: { voicemail: boolean; sms: boolean; email: boolean };
  canSendLive: boolean;
  missing: { voicemail: string | null; sms: string | null; email: string | null };
};

type TestCampaignRunModalProps = {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  campaignName: string;
  onDone: (message: string) => void;
};

export function TestCampaignRunModal({
  open,
  onClose,
  campaignId,
  campaignName,
  onDone,
}: TestCampaignRunModalProps) {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [providers, setProviders] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"mock" | "live">("mock");

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setSearch("");
    setError(null);
    setMode("mock");
    (async () => {
      setLoading(true);
      const [contactsEnv, providersEnv] = await Promise.all([
        safeFetch<{ contacts: ContactRow[] }>("/api/contacts"),
        safeFetch<ProviderStatus>("/api/providers/status"),
      ]);
      setLoading(false);
      if (contactsEnv.success) setContacts(contactsEnv.data.contacts);
      else setError(contactsEnv.error);
      if (providersEnv.success) setProviders(providersEnv.data);
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim().toLowerCase();
      return (
        name.includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, search]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRun = async () => {
    if (selectedIds.size === 0) return;
    if (mode === "live" && providers && !providers.canSendLive) {
      setError(
        "Live providers are not configured in Vercel yet. Use Simulation, or add Twilio / Slybroadcast / Resend keys first.",
      );
      return;
    }
    setRunning(true);
    setError(null);
    const envelope = await safeFetch<{ message: string }>(
      `/api/campaigns/${campaignId}/test-run`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: [...selectedIds], mode }),
      },
    );
    setRunning(false);
    if (!envelope.success) {
      setError(envelope.error);
      return;
    }
    onDone(envelope.data.message);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Run campaign sequence"
      description={`Run “${campaignName}” for selected contacts. Simulation checks the pipeline; Live send uses real SMS / voicemail / email providers.`}
      icon="science"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel={
            running
              ? "Running…"
              : mode === "live"
                ? "Send live now"
                : "Run simulation"
          }
          onPrimary={() => void handleRun()}
          primaryDisabled={running || loading || selectedIds.size === 0}
          primaryLoading={running}
        />
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("mock")}
            className={cn(
              "rounded-xl border px-4 py-3 text-left text-[13px]",
              mode === "mock"
                ? "border-rose-gold/40 bg-rose-gold/10"
                : "border-outline-variant/20",
            )}
          >
            <p className="font-medium text-ink">Simulation</p>
            <p className="mt-1 text-taupe">
              Marks steps complete in ARI — does <strong>not</strong> text or call the phone.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode("live")}
            className={cn(
              "rounded-xl border px-4 py-3 text-left text-[13px]",
              mode === "live"
                ? "border-rose-gold/40 bg-rose-gold/10"
                : "border-outline-variant/20",
            )}
          >
            <p className="font-medium text-ink">Live send</p>
            <p className="mt-1 text-taupe">
              Actually delivers via Twilio / Slybroadcast / Resend when configured.
            </p>
          </button>
        </div>

        {providers ? (
          <div className="rounded-xl border border-outline-variant/15 bg-cream/60 px-4 py-3 text-[12px] text-slate-text">
            <p className="font-medium text-ink">Provider status</p>
            <ul className="mt-2 space-y-1">
              <li>
                SMS (Twilio):{" "}
                {providers.configured.sms ? (
                  <span className="text-emerald-muted">ready</span>
                ) : (
                  <span className="text-error">not configured</span>
                )}
              </li>
              <li>
                Ringless VM (Slybroadcast):{" "}
                {providers.configured.voicemail ? (
                  <span className="text-emerald-muted">ready</span>
                ) : (
                  <span className="text-error">not configured</span>
                )}
              </li>
              <li>
                Email (Resend):{" "}
                {providers.configured.email ? (
                  <span className="text-emerald-muted">ready</span>
                ) : (
                  <span className="text-error">not configured</span>
                )}
              </li>
            </ul>
            {mode === "live" && !providers.canSendLive ? (
              <p className="mt-2 text-error">
                Add at least one provider’s env vars in Vercel before live send will work.
              </p>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <p className="text-[13px] text-taupe">Loading contacts…</p>
        ) : (
          <>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts"
              className="w-full rounded-xl border border-outline-variant/20 bg-cream/60 px-4 py-2.5 text-[14px] outline-none focus:border-rose-gold/50"
            />
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {filtered.map((c) => {
                const name = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "Contact";
                const checked = selectedIds.has(c.id);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => toggle(c.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] hover:bg-champagne/60",
                        checked && "bg-rose-gold/10",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px]",
                          checked
                            ? "border-rose-gold bg-rose-gold text-ivory"
                            : "border-outline-variant/40",
                        )}
                      >
                        {checked ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-ink">{name}</span>
                        <span className="block truncate text-[12px] text-taupe">
                          {c.phone ?? c.email ?? "—"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {error ? (
          <p className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-[13px] text-error">
            {error}
          </p>
        ) : null}

        {selectedIds.size > 0 ? (
          <p className="flex items-center gap-2 text-[12px] text-taupe">
            <Icon name="check_circle" className="text-[16px] text-emerald-muted" />
            {selectedIds.size} contact{selectedIds.size === 1 ? "" : "s"} selected
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
