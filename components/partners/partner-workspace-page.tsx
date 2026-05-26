"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { Modal, ModalField, ModalFooterActions, modalInputClass, modalLabelClass } from "@/components/crm/modal";
import { Icon } from "@/components/ui/icon";
import { safeFetch } from "@/lib/api-response";
import { cn } from "@/lib/cn";
import { useCallback, useEffect, useMemo, useState } from "react";

type Partner = {
  id: string;
  owner_id: string;
  name: string;
  type: "lender" | "co_agent" | "vendor" | "team_member" | "other";
  brand_color: string | null;
  logo_url: string | null;
  notes: string | null;
  created_at: string;
};

type Invitation = {
  id: string;
  partner_id: string;
  email: string;
  role: "viewer" | "collaborator" | "approver";
  status: "pending" | "accepted" | "revoked" | "expired";
  invited_at: string;
  accepted_at?: string | null;
  token: string;
};

type SharedAsset = {
  id: string;
  partner_id: string;
  asset_type: "campaign" | "voice_asset" | "script" | "contact_list" | "note";
  asset_id: string;
  permission: "view" | "edit" | "approve";
  approval_status: "pending" | "approved" | "rejected";
  shared_at: string;
};

type Toast = { message: string; tone: "success" | "error" };

const PARTNER_TYPES: { id: Partner["type"]; label: string; description: string; icon: string }[] = [
  { id: "lender", label: "Lender", description: "Mortgage and finance partners", icon: "account_balance" },
  { id: "co_agent", label: "Co-agent", description: "Co-listing agents and brokers", icon: "groups" },
  { id: "vendor", label: "Vendor", description: "Stagers, photographers, marketers", icon: "store" },
  { id: "team_member", label: "Team member", description: "Internal team collaborators", icon: "person" },
  { id: "other", label: "Other", description: "Custom partner", icon: "handshake" },
];

export function PartnerWorkspacePage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [sharedAssets, setSharedAssets] = useState<SharedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPartnerOpen, setNewPartnerOpen] = useState(false);
  const [inviteOpenFor, setInviteOpenFor] = useState<Partner | null>(null);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    const envelope = await safeFetch<{
      partners: Partner[];
      invitations: Invitation[];
      sharedAssets: SharedAsset[];
    }>("/api/partners");
    setLoading(false);
    if (envelope.success) {
      setPartners(envelope.data.partners);
      setInvitations(envelope.data.invitations);
      setSharedAssets(envelope.data.sharedAssets);
      if (!activePartnerId && envelope.data.partners[0]) {
        setActivePartnerId(envelope.data.partners[0].id);
      }
    } else {
      showToast(envelope.error, "error");
    }
  }, [activePartnerId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activePartner = useMemo(
    () => partners.find((p) => p.id === activePartnerId) ?? partners[0],
    [partners, activePartnerId],
  );

  const partnerInvitations = useMemo(
    () => invitations.filter((i) => i.partner_id === activePartner?.id),
    [invitations, activePartner],
  );

  const partnerAssets = useMemo(
    () => sharedAssets.filter((a) => a.partner_id === activePartner?.id),
    [sharedAssets, activePartner],
  );

  const totalPartners = partners.length;
  const acceptedInvites = invitations.filter((i) => i.status === "accepted").length;
  const pendingApprovals = sharedAssets.filter((a) => a.approval_status === "pending").length;

  return (
    <div className="luxury-page p-8 max-w-[1500px] w-full mx-auto space-y-8">
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[150] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-card",
            toast.tone === "success" ? "border-emerald-muted/30 bg-ivory" : "border-error/30 bg-ivory",
          )}
          role="status"
        >
          <Icon
            name={toast.tone === "success" ? "check_circle" : "error"}
            className={toast.tone === "success" ? "text-emerald-muted" : "text-error"}
          />
          <span className="text-[14px] text-ink">{toast.message}</span>
        </div>
      ) : null}

      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-taupe">
            Relationship marketing
          </p>
          <h1 className="mt-1 font-serif text-[36px] font-semibold text-ink">Partner workspaces</h1>
          <p className="mt-2 max-w-2xl text-[15px] text-slate-text">
            Co-brand campaigns with lenders, approve shared assets, and run collaborative outreach —
            without juggling external tools.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNewPartnerOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory shadow-card transition-all hover:opacity-95 active:scale-95"
        >
          <Icon name="add" />
          New partner
        </button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: "Partners", value: totalPartners.toString(), icon: "handshake" },
          { label: "Accepted invites", value: acceptedInvites.toString(), icon: "mark_email_read" },
          { label: "Pending approvals", value: pendingApprovals.toString(), icon: "pending_actions" },
        ].map((stat) => (
          <LuxuryCard key={stat.label} padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-taupe">{stat.label}</p>
                <p className="mt-1 font-serif text-[28px] font-semibold text-ink">{stat.value}</p>
              </div>
              <Icon name={stat.icon} className="text-[32px] text-rose-gold-deep" />
            </div>
          </LuxuryCard>
        ))}
      </div>

      {loading ? (
        <LuxuryCard padding="lg">
          <p className="text-center text-taupe">Loading partners…</p>
        </LuxuryCard>
      ) : partners.length === 0 ? (
        <LuxuryCard padding="lg">
          <div className="mx-auto max-w-md py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-gold/15 text-rose-gold-deep">
              <Icon name="handshake" className="text-[36px]" />
            </div>
            <h2 className="mt-4 font-serif text-[24px] font-semibold text-ink">
              Build your relationship marketing network
            </h2>
            <p className="mt-2 text-[14px] text-slate-text">
              Add your first lender, co-agent, or vendor to start running co-branded campaigns and
              sharing voice assets with approvals.
            </p>
            <button
              type="button"
              onClick={() => setNewPartnerOpen(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory"
            >
              <Icon name="add" />
              Add first partner
            </button>
          </div>
        </LuxuryCard>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <LuxuryCard padding="md">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-taupe">
              Workspaces
            </p>
            <ul className="space-y-1">
              {partners.map((partner) => (
                <li key={partner.id}>
                  <button
                    type="button"
                    onClick={() => setActivePartnerId(partner.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      partner.id === activePartner?.id
                        ? "bg-champagne text-ink"
                        : "text-taupe hover:bg-cream",
                    )}
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-full text-ivory"
                      style={{ backgroundColor: partner.brand_color ?? "#B98A6F" }}
                    >
                      <Icon
                        name={
                          PARTNER_TYPES.find((t) => t.id === partner.type)?.icon ?? "handshake"
                        }
                        className="text-[18px]"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{partner.name}</p>
                      <p className="text-[11px] text-taupe">
                        {PARTNER_TYPES.find((t) => t.id === partner.type)?.label}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </LuxuryCard>

          {activePartner ? (
            <div className="space-y-6">
              <LuxuryCard padding="lg">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-taupe">
                      {PARTNER_TYPES.find((t) => t.id === activePartner.type)?.label} workspace
                    </p>
                    <h2 className="mt-1 font-serif text-[28px] font-semibold text-ink">
                      {activePartner.name}
                    </h2>
                    {activePartner.notes ? (
                      <p className="mt-2 max-w-xl text-[14px] text-slate-text">
                        {activePartner.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setInviteOpenFor(activePartner)}
                      className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-4 py-2 text-[13px] font-medium text-ink hover:bg-champagne"
                    >
                      <Icon name="person_add" className="text-[18px]" /> Invite collaborator
                    </button>
                  </div>
                </div>
              </LuxuryCard>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <LuxuryCard padding="lg">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif text-[18px] font-semibold text-ink">
                      Invitations
                    </h3>
                    <span className="text-[12px] text-taupe">{partnerInvitations.length} total</span>
                  </div>
                  {partnerInvitations.length === 0 ? (
                    <p className="text-[13px] text-taupe">
                      No invitations yet. Invite collaborators to share campaigns and approve assets.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {partnerInvitations.map((inv) => (
                        <li
                          key={inv.id}
                          className="flex items-center justify-between rounded-xl border border-outline-variant/15 bg-cream/50 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-ink">{inv.email}</p>
                            <p className="text-[11px] text-taupe">
                              {inv.role} · {inv.status}
                            </p>
                          </div>
                          {inv.status === "pending" ? (
                            <button
                              type="button"
                              onClick={async () => {
                                const envelope = await safeFetch("/api/partners/invitations", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: inv.id, status: "revoked" }),
                                });
                                if (envelope.success) {
                                  showToast("Invitation revoked");
                                  void refresh();
                                } else {
                                  showToast(envelope.error, "error");
                                }
                              }}
                              className="text-[12px] font-medium text-error hover:underline"
                            >
                              Revoke
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </LuxuryCard>

                <LuxuryCard padding="lg">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-serif text-[18px] font-semibold text-ink">
                      Shared assets
                    </h3>
                    <span className="text-[12px] text-taupe">{partnerAssets.length} shared</span>
                  </div>
                  {partnerAssets.length === 0 ? (
                    <p className="text-[13px] text-taupe">
                      Share a campaign, voice asset, or contact list with this partner from its
                      detail page.
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {partnerAssets.map((asset) => (
                        <li
                          key={asset.id}
                          className="flex items-center justify-between rounded-xl border border-outline-variant/15 bg-cream/50 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-ink">
                              {asset.asset_type.replace("_", " ")}
                            </p>
                            <p className="text-[11px] text-taupe">
                              {asset.permission} · {asset.approval_status}
                            </p>
                          </div>
                          {asset.approval_status === "pending" ? (
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  const envelope = await safeFetch("/api/partners/shared-assets", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      id: asset.id,
                                      approvalStatus: "approved",
                                    }),
                                  });
                                  if (envelope.success) {
                                    showToast("Asset approved");
                                    void refresh();
                                  }
                                }}
                                className="rounded-full bg-emerald-muted/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-muted hover:bg-emerald-muted/25"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  const envelope = await safeFetch("/api/partners/shared-assets", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      id: asset.id,
                                      approvalStatus: "rejected",
                                    }),
                                  });
                                  if (envelope.success) {
                                    showToast("Asset rejected");
                                    void refresh();
                                  }
                                }}
                                className="rounded-full bg-error/10 px-2.5 py-1 text-[11px] font-semibold text-error hover:bg-error/20"
                              >
                                Reject
                              </button>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </LuxuryCard>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <NewPartnerModal
        open={newPartnerOpen}
        onClose={() => setNewPartnerOpen(false)}
        onCreated={() => {
          showToast("Partner workspace created");
          void refresh();
        }}
      />
      <InviteCollaboratorModal
        partner={inviteOpenFor}
        onClose={() => setInviteOpenFor(null)}
        onCreated={() => {
          showToast("Invitation sent");
          void refresh();
        }}
      />
    </div>
  );
}

function NewPartnerModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Partner["type"]>("lender");
  const [brandColor, setBrandColor] = useState("#B98A6F");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setType("lender");
      setBrandColor("#B98A6F");
      setNotes("");
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    const envelope = await safeFetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), type, brandColor, notes }),
    });
    setSaving(false);
    if (envelope.success) {
      onCreated();
      onClose();
    } else {
      setError(envelope.error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New partner workspace"
      description="Create a co-branded workspace for a lender, agent, or vendor."
      icon="handshake"
      size="lg"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel="Create workspace"
          onPrimary={() => void submit()}
          primaryLoading={saving}
        />
      }
    >
      <div className="space-y-4">
        <ModalField label="Partner name" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={modalInputClass}
            placeholder="Empire Mortgage"
          />
        </ModalField>
        <ModalField label="Type">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PARTNER_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={cn(
                  "rounded-xl border p-3 text-left transition-colors",
                  type === t.id
                    ? "border-rose-gold bg-champagne"
                    : "border-outline-variant/20 hover:border-rose-gold/30",
                )}
              >
                <Icon name={t.icon} className="text-[20px] text-rose-gold-deep" />
                <p className="mt-1 text-[13px] font-medium text-ink">{t.label}</p>
                <p className="text-[11px] text-taupe">{t.description}</p>
              </button>
            ))}
          </div>
        </ModalField>
        <div className="grid grid-cols-2 gap-3">
          <ModalField label="Brand color">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-11 w-full cursor-pointer rounded-xl border border-outline-variant/35 bg-ivory"
            />
          </ModalField>
        </div>
        <ModalField label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={cn(modalInputClass, "h-auto py-3")}
            placeholder="Partner specialties, preferences, contacts…"
          />
        </ModalField>
        {error ? <p className={cn(modalLabelClass, "text-error")}>{error}</p> : null}
      </div>
    </Modal>
  );
}

function InviteCollaboratorModal({
  partner,
  onClose,
  onCreated,
}: {
  partner: Partner | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "collaborator" | "approver">("collaborator");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (partner) {
      setEmail("");
      setRole("collaborator");
      setError(null);
    }
  }, [partner]);

  const submit = async () => {
    if (!partner) return;
    if (!email.includes("@")) {
      setError("Enter a valid email");
      return;
    }
    setSaving(true);
    const envelope = await safeFetch("/api/partners/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId: partner.id, email: email.trim(), role }),
    });
    setSaving(false);
    if (envelope.success) {
      onCreated();
      onClose();
    } else {
      setError(envelope.error);
    }
  };

  return (
    <Modal
      open={partner !== null}
      onClose={onClose}
      title={`Invite to ${partner?.name ?? "partner"}`}
      description="Share campaigns and assets with your partner. Permissions can be changed later."
      icon="person_add"
      footer={
        <ModalFooterActions
          onCancel={onClose}
          primaryLabel="Send invite"
          onPrimary={() => void submit()}
          primaryLoading={saving}
        />
      }
    >
      <div className="space-y-4">
        <ModalField label="Email" required>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className={modalInputClass}
            placeholder="partner@brokerage.com"
          />
        </ModalField>
        <ModalField label="Role">
          <div className="grid grid-cols-3 gap-2">
            {(["viewer", "collaborator", "approver"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-[12px] font-medium capitalize transition-colors",
                  role === r
                    ? "border-rose-gold bg-champagne text-ink"
                    : "border-outline-variant/20 text-taupe hover:bg-cream",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </ModalField>
        {error ? <p className={cn(modalLabelClass, "text-error")}>{error}</p> : null}
      </div>
    </Modal>
  );
}
