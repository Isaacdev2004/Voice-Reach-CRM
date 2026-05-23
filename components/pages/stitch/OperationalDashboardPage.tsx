"use client";

import Link from "next/link";
import { AiSuggestionPanel } from "@/components/crm/ai-suggestion-panel";
import { ContactPageActions } from "@/components/crm/contact-page-actions";
import { DashboardConcierge } from "@/components/crm/dashboard-concierge";
import { KpiCard } from "@/components/crm/kpi-card";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import {
  DASHBOARD_ACTIVITY,
  DASHBOARD_AI_SUGGESTIONS,
  DASHBOARD_KPIS,
} from "@/lib/crm/mock-data";
import { useContacts } from "@/lib/hooks/use-contacts";

const activityIcons = {
  voicemail: { icon: "voicemail", tone: "bg-sage-light text-emerald-muted" },
  email: { icon: "mail", tone: "bg-bronze-light text-bronze" },
  sms: { icon: "sms", tone: "bg-champagne text-taupe" },
  callback: { icon: "phone_callback", tone: "bg-rose-gold/20 text-rose-gold-deep" },
};

export function OperationalDashboardPage() {
  const { refresh } = useContacts();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="luxury-page p-8 max-w-[1400px] w-full mx-auto space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-taupe">
            Dashboard
          </p>
          <h1 className="font-serif text-[36px] font-semibold tracking-tight text-ink md:text-[40px]">
            {greeting}
          </h1>
          <p className="mt-1 text-[15px] text-slate-text">
            Overview of relationships, campaigns, and today&apos;s engagement.
          </p>
        </div>
        <ContactPageActions onRefresh={refresh} variant="compact" />
      </header>

      <DashboardConcierge />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {DASHBOARD_KPIS.map((kpi) => (
          <KpiCard key={kpi.id} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <LuxuryCard padding="lg" className="lg:col-span-5">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-[22px] font-semibold text-ink">Today&apos;s activity</h2>
            <Link href="/dashboard/activity" className="text-[13px] text-rose-gold-deep hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-4">
            {DASHBOARD_ACTIVITY.map((item) => {
              const meta = activityIcons[item.type];
              return (
                <li key={item.id} className="flex gap-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${meta.tone}`}
                  >
                    <Icon name={meta.icon} className="text-[20px]" />
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

        <LuxuryCard padding="lg" className="lg:col-span-4">
          <h2 className="mb-6 font-serif text-[22px] font-semibold text-ink">Campaign performance</h2>
          <div className="space-y-6">
            {[
              { label: "Open rate", value: "38.2%", bar: "w-[38%]" },
              { label: "Delivery rate", value: "94.2%", bar: "w-[94%]" },
              { label: "Engagement rate", value: "24.9%", bar: "w-[25%]" },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="mb-2 flex justify-between text-[14px]">
                  <span className="text-taupe">{metric.label}</span>
                  <span className="font-medium text-ink">{metric.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-champagne">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-rose-gold to-sage ${metric.bar}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/campaigns"
            className="mt-6 inline-flex items-center gap-1 text-[14px] font-medium text-rose-gold-deep"
          >
            Open campaign builder <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </LuxuryCard>

        <div className="lg:col-span-3 space-y-4">
          <Link href="/dashboard/contacts" className="block">
            <LuxuryCard padding="md" className="transition-shadow hover:shadow-nav">
              <p className="text-[12px] uppercase tracking-wider text-taupe">Pending follow-ups</p>
              <p className="mt-2 font-serif text-[36px] font-semibold text-ink">7</p>
              <p className="mt-1 text-[13px] text-rose-gold-deep">Review contacts →</p>
            </LuxuryCard>
          </Link>
          <Link href="/dashboard/campaigns" className="block">
            <LuxuryCard padding="md" className="transition-shadow hover:shadow-nav">
              <p className="text-[12px] uppercase tracking-wider text-taupe">Daily touches sent</p>
              <p className="mt-2 font-serif text-[36px] font-semibold text-ink">142</p>
              <p className="mt-1 text-[13px] text-emerald-muted">View campaigns →</p>
            </LuxuryCard>
          </Link>
        </div>
      </div>

      <AiSuggestionPanel title="AI recommendations" suggestions={DASHBOARD_AI_SUGGESTIONS} />
    </div>
  );
}
