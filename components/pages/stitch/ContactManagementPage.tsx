"use client";

import Link from "next/link";
import { CompliancePanel } from "@/components/crm/compliance-panel";
import { ComplianceBadge } from "@/components/crm/compliance-badge";
import { ContactPageActions } from "@/components/crm/contact-page-actions";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { DEMO_CONTACT } from "@/lib/crm/mock-data";
import { useDashboardSearch } from "@/lib/hooks/use-dashboard-search";
import { useContacts, type ApiContact } from "@/lib/hooks/use-contacts";

function initials(first: string, last?: string | null) {
  return `${first[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function consentStatus(contact: ApiContact): "valid" | "pending" | "blocked" | "review" {
  if (contact.dnc) return "blocked";
  const status = contact.consent_records?.[0]?.status;
  if (status === "Yes") return "valid";
  if (status === "No") return "blocked";
  return "pending";
}

const FALLBACK_ROWS: ApiContact[] = [
  {
    id: DEMO_CONTACT.id,
    first_name: DEMO_CONTACT.firstName,
    last_name: DEMO_CONTACT.lastName,
    phone: DEMO_CONTACT.phone ?? "",
    email: DEMO_CONTACT.email,
    source: "Referral",
    consent_records: [{ status: "Yes" }],
  },
];

export function ContactManagementPage() {
  const headerQuery = useDashboardSearch();
  const { contacts, loading, error, refresh, meta } = useContacts(headerQuery);
  const rows = contacts.length > 0 ? contacts : FALLBACK_ROWS;
  const total = meta?.total ?? (contacts.length > 0 ? contacts.length : rows.length);

  const validated = rows.filter((c) => consentStatus(c) === "valid").length;
  const dncCount = rows.filter((c) => c.dnc || consentStatus(c) === "blocked").length;

  return (
    <div className="luxury-page p-8 max-w-[1400px] w-full mx-auto space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
            Contacts
          </p>
          <h1 className="font-serif text-[36px] font-semibold text-ink">Your relationships</h1>
          <p className="mt-1 text-[15px] text-slate-text">
            Click a name to open the full relationship profile.
          </p>
        </div>
        <ContactPageActions onRefresh={refresh} />
      </header>

      {error ? (
        <p className="rounded-2xl bg-champagne px-4 py-3 text-[14px] text-taupe">
          Live data unavailable — showing demo contacts. ({error})
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total contacts", value: loading ? "…" : total.toLocaleString() },
          {
            label: "Consent validated",
            value: loading ? "…" : `${rows.length ? Math.round((validated / rows.length) * 100) : 0}%`,
          },
          { label: "DNC / blocked", value: loading ? "…" : String(dncCount) },
          { label: "In active sequences", value: "12" },
        ].map((stat) => (
          <LuxuryCard key={stat.label} padding="md">
            <p className="text-[13px] text-taupe">{stat.label}</p>
            <p className="mt-1 font-serif text-[28px] font-semibold text-ink">{stat.value}</p>
          </LuxuryCard>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-outline-variant/10 bg-champagne/40 px-4 py-3">
        <p className="flex items-center gap-2 text-[14px] text-slate-text">
          <Icon name="favorite" className="text-[18px] text-rose-gold-deep" />
          Each row opens timeline, signals, tasks, and AI suggestions.
        </p>
        <Link
          href={`/dashboard/contacts/${rows[0]?.id ?? DEMO_CONTACT.id}`}
          className="text-[13px] font-medium text-rose-gold-deep whitespace-nowrap hover:underline"
        >
          Try sample profile →
        </Link>
      </div>

      <LuxuryCard padding="none" className="overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-taupe">Loading contacts…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-cream/80">
                  <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-taupe">
                    Name
                  </th>
                  <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-taupe">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-taupe">
                    Source
                  </th>
                  <th className="px-6 py-4 text-[12px] font-semibold uppercase tracking-wider text-taupe">
                    Compliance
                  </th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {rows.map((contact) => (
                  <tr key={contact.id} className="transition-colors hover:bg-cream/50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-champagne font-semibold text-[12px] text-taupe">
                          {initials(contact.first_name, contact.last_name)}
                        </div>
                        <div>
                          <p className="font-medium text-ink group-hover:text-rose-gold-deep">
                            {contact.first_name} {contact.last_name ?? ""}
                          </p>
                          {contact.email ? (
                            <p className="text-[12px] text-slate-text">{contact.email}</p>
                          ) : null}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-[14px] text-ink">{contact.phone}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-champagne/80 px-3 py-1 text-[12px] text-taupe">
                        {contact.source ?? "—"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ComplianceBadge status={consentStatus(contact)} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="text-[13px] font-medium text-rose-gold-deep hover:underline"
                      >
                        Open profile →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LuxuryCard>

      {headerQuery.trim() && contacts.length > 0 ? (
        <p className="text-[14px] text-taupe">
          Showing {meta?.filtered ?? rows.length} of {total} contacts matching &quot;{headerQuery}&quot;
        </p>
      ) : null}

      <CompliancePanel />
    </div>
  );
}
