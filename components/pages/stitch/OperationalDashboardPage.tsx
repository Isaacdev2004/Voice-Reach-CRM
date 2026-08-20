"use client";

import Link from "next/link";
import { ContactAvatar } from "@/components/crm/contact-avatar";
import { DashboardDeckHero } from "@/components/crm/dashboard-deck-hero";
import { KpiCard } from "@/components/crm/kpi-card";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { MarketingPulse } from "@/components/crm/marketing-pulse";
import { Icon } from "@/components/ui/icon";
import { contactSegment } from "@/lib/contacts/lifecycle";
import { DASHBOARD_ACTIVITY } from "@/lib/crm/mock-data";
import { useContacts } from "@/lib/hooks/use-contacts";

const activityIcons = {
  voicemail: { icon: "voicemail", tone: "bg-sage-light text-emerald-muted" },
  email: { icon: "mail", tone: "bg-bronze-light text-bronze" },
  sms: { icon: "sms", tone: "bg-champagne text-taupe" },
  callback: { icon: "phone_callback", tone: "bg-rose-gold/20 text-rose-gold-deep" },
};

const segmentBadge: Record<string, string> = {
  "cold-lead": "Cold lead",
  "active-lead": "Active",
  "past-client": "Past client",
};

export function OperationalDashboardPage() {
  const { contacts, loading, meta } = useContacts();
  const total = meta?.total ?? contacts.length;
  const coldLeads = meta?.counts?.coldLead ?? 0;
  const activeLeads = meta?.counts?.activeLead ?? 0;
  const topContacts = contacts.slice(0, 4);

  const kpis = [
    {
      id: "contacts",
      label: "Total contacts",
      value: loading ? "…" : total.toLocaleString(),
      change: coldLeads > 0 ? `${coldLeads} cold leads` : undefined,
      icon: "group",
      tone: "default" as const,
    },
    {
      id: "active",
      label: "Active leads",
      value: loading ? "…" : String(activeLeads),
      change: activeLeads > 0 ? "Warm pipeline" : undefined,
      icon: "person",
      tone: "rose" as const,
    },
    {
      id: "campaigns",
      label: "Campaigns",
      value: "12",
      change: "Active",
      icon: "campaign",
      tone: "bronze" as const,
    },
    {
      id: "tasks",
      label: "Tasks due",
      value: "7",
      change: "Due today",
      icon: "task_alt",
      tone: "sage" as const,
    },
  ];

  return (
    <div className="luxury-page w-full max-w-[1400px] mx-auto space-y-6 px-4 py-6 sm:p-8">
      <DashboardDeckHero />

      <MarketingPulse />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.id} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <LuxuryCard padding="lg" className="xl:col-span-5">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-[22px] font-semibold text-ink">Top contacts</h2>
            <Link
              href="/dashboard/contacts"
              className="text-[13px] font-medium text-rose-gold-deep hover:underline"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <p className="text-taupe">Loading contacts…</p>
          ) : topContacts.length === 0 ? (
            <p className="text-[14px] text-slate-text">
              Import contacts or add your first relationship to see them here.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/15">
              {topContacts.map((contact) => {
                const seg = contactSegment(contact.type);
                return (
                  <li key={contact.id}>
                    <Link
                      href={`/dashboard/contacts/${contact.id}`}
                      className="flex items-center gap-4 py-4 transition-colors hover:bg-cream/40 -mx-2 px-2 rounded-xl"
                    >
                      <ContactAvatar
                        firstName={contact.first_name}
                        lastName={contact.last_name}
                        size="md"
                        className="ring-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">
                          {contact.first_name} {contact.last_name ?? ""}
                        </p>
                        <p className="truncate text-[13px] text-slate-text">
                          {contact.source ?? contact.email ?? contact.phone}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-champagne px-3 py-1 text-[11px] font-medium text-taupe">
                        {segmentBadge[seg] ?? "Contact"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </LuxuryCard>

        <LuxuryCard padding="lg" className="xl:col-span-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-[22px] font-semibold text-ink">Recent activity</h2>
            <Link
              href="/dashboard/activity"
              className="text-[13px] font-medium text-rose-gold-deep hover:underline"
            >
              View all
            </Link>
          </div>
          <ul className="space-y-4">
            {DASHBOARD_ACTIVITY.slice(0, 4).map((item) => {
              const tone = activityIcons[item.type];
              return (
                <li key={item.id} className="flex gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tone.tone}`}
                  >
                    <Icon name={tone.icon} className="text-[20px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{item.contactName}</p>
                    <p className="text-[14px] text-slate-text">{item.description}</p>
                    <p className="mt-1 text-[12px] text-taupe">{item.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </LuxuryCard>

        <div className="space-y-4 xl:col-span-3">
          <Link href="/dashboard/tasks" className="block">
            <LuxuryCard padding="md" className="transition-shadow hover:shadow-nav">
              <p className="text-[12px] uppercase tracking-wider text-taupe">Tasks due</p>
              <p className="mt-2 font-serif text-[36px] font-semibold text-ink">7</p>
              <p className="mt-1 text-[13px] text-rose-gold-deep">Open tasks →</p>
            </LuxuryCard>
          </Link>
          <Link href="/dashboard/campaigns" className="block">
            <LuxuryCard padding="md" className="transition-shadow hover:shadow-nav">
              <p className="text-[12px] uppercase tracking-wider text-taupe">Campaign builder</p>
              <p className="mt-2 text-[14px] font-medium text-ink">Launch your next sequence</p>
              <p className="mt-1 text-[13px] text-emerald-muted">Open campaigns →</p>
            </LuxuryCard>
          </Link>
        </div>
      </div>
    </div>
  );
}
