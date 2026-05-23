"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal, ModalFooterActions } from "./modal";
import { ComplianceBadge } from "./compliance-badge";
import { LuxuryCard } from "./luxury-card";
import type { ComplianceIssueSummary } from "@/lib/compliance/scan";

export function CompliancePanel() {
  const [issues, setIssues] = useState<ComplianceIssueSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [eligible, setEligible] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [auditDone, setAuditDone] = useState(false);
  const [auditSummary, setAuditSummary] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    const res = await fetch("/api/compliance/audit", { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not load compliance data");
    return data as {
      issues: ComplianceIssueSummary[];
      total: number;
      eligible: number;
    };
  }, []);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAudit();
      setIssues(data.issues ?? []);
      setTotal(data.total ?? 0);
      setEligible(data.eligible ?? 0);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load compliance data");
      setIssues([]);
    } finally {
      setLoading(false);
    }
  }, [fetchAudit]);

  useEffect(() => {
    void loadIssues();
  }, [loadIssues]);

  const runAudit = async () => {
    setAuditing(true);
    setAuditDone(false);
    setAuditSummary(null);
    try {
      const data = await fetchAudit();
      setIssues(data.issues ?? []);
      setTotal(data.total ?? 0);
      setEligible(data.eligible ?? 0);
      setAuditDone(true);
      const attention = (data.issues ?? [])
        .filter((i) => i.id !== "eligible")
        .reduce((n, i) => n + i.count, 0);
      setAuditSummary(
        attention === 0
          ? `All ${data.total} contacts passed eligibility checks.`
          : `${attention} issue(s) across ${data.total} contacts — ${data.eligible} eligible for outreach.`,
      );
    } catch {
      setAuditSummary("Audit finished with errors. Try again.");
    } finally {
      setAuditing(false);
    }
  };

  const attentionCount = issues
    .filter((i) => i.id !== "eligible")
    .reduce((n, i) => n + i.count, 0);

  return (
    <>
      <LuxuryCard padding="lg">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-light text-emerald-muted">
              <span className="material-symbols-outlined text-[26px]">verified_user</span>
            </div>
            <div>
              <h3 className="font-serif text-[22px] font-semibold text-ink">Compliance engine</h3>
              <p className="text-[13px] text-taupe">
                Live scan · {total} contacts · {eligible} eligible
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadIssues()}
            disabled={loading}
            className="shrink-0 rounded-full border border-outline-variant/30 px-3 py-1.5 text-[12px] font-medium text-taupe hover:text-ink disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        {loadError ? (
          <p className="mb-4 rounded-xl bg-champagne px-4 py-3 text-[14px] text-taupe">{loadError}</p>
        ) : null}

        {loading ? (
          <p className="py-6 text-center text-[14px] text-taupe">Scanning contacts…</p>
        ) : issues.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-taupe">No contacts to scan yet.</p>
        ) : (
          <ul className="space-y-4">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className="flex items-center justify-between rounded-2xl border border-outline-variant/10 bg-cream/60 px-4 py-3"
              >
                <div>
                  <p className="text-[14px] font-medium text-ink">{issue.label}</p>
                  <p className="text-[12px] text-taupe">{issue.count} contacts affected</p>
                </div>
                <ComplianceBadge status={issue.status} />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => {
            setAuditDone(false);
            setAuditSummary(null);
            setAuditOpen(true);
          }}
          className="mt-6 w-full rounded-full border border-outline-variant/40 py-3 text-[14px] font-medium text-ink transition-colors hover:bg-champagne"
        >
          Run full compliance audit
        </button>
      </LuxuryCard>

      <Modal
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        title="Compliance audit"
        description="Scans your live contact list for DNC flags, consent, and phone validity."
        icon="verified_user"
        size="md"
        footer={
          <ModalFooterActions
            onCancel={() => setAuditOpen(false)}
            cancelLabel={auditDone ? "Close" : "Cancel"}
            primaryLabel={auditDone ? "Done" : auditing ? "Running…" : "Start audit"}
            onPrimary={auditDone ? () => setAuditOpen(false) : () => void runAudit()}
            primaryDisabled={auditing}
            primaryLoading={auditing}
          />
        }
      >
        {!auditDone ? (
          <ul className="space-y-3 text-[14px] text-slate-text">
            {[
              "Loading contacts from your CRM",
              "Evaluating TCPA consent records",
              "Checking DNC flags and phone numbers",
              "Summarizing eligibility for outreach",
            ].map((step) => (
              <li key={step} className="flex items-center gap-3 rounded-xl bg-cream/60 px-4 py-3">
                <span className="material-symbols-outlined text-[20px] text-rose-gold-deep">
                  radio_button_unchecked
                </span>
                {step}
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-3">
            <p className="rounded-xl border border-emerald-muted/25 bg-sage-light/40 px-4 py-4 text-[14px] text-emerald-muted">
              {auditSummary ?? `Audit complete. ${attentionCount} items need attention.`}
            </p>
            <ul className="space-y-2 text-[13px] text-slate-text">
              {issues
                .filter((i) => i.id !== "eligible")
                .map((i) => (
                  <li key={i.id}>
                    {i.label}: <strong>{i.count}</strong>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </Modal>
    </>
  );
}
