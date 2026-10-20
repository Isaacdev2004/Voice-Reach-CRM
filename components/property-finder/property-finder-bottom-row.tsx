"use client";

import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import Image from "next/image";
import Link from "next/link";

export type SuggestedStep = {
  id: string;
  contactId?: string;
  contactName: string;
  task: string;
  when: string;
};

type PropertyFinderBottomRowProps = {
  steps: SuggestedStep[];
  onSelectContact?: (id: string) => void;
};

export function PropertyFinderBottomRow({ steps, onSelectContact }: PropertyFinderBottomRowProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <LuxuryCard padding="lg" className="lg:col-span-7">
        <div className="mb-5 flex items-start justify-between gap-2">
          <div>
            <h2 className="font-serif text-[22px] font-semibold text-ink">Suggested next steps</h2>
            <p className="mt-1 text-[13px] text-slate-text">Follow-ups tied to your active clients</p>
          </div>
          <Link
            href="/dashboard/tasks"
            className="shrink-0 text-[13px] font-medium text-rose-gold-deep hover:underline"
          >
            View all →
          </Link>
        </div>
        {steps.length === 0 ? (
          <p className="text-[14px] text-slate-text">
            No open tasks yet. Add follow-ups in Tasks and they will show here.
          </p>
        ) : (
        <ul className="divide-y divide-outline-variant/10">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-outline-variant/30">
                <span className="h-2 w-2 rounded-full bg-rose-gold/60" />
              </span>
              <div className="min-w-0 flex-1">
                {step.contactId && onSelectContact ? (
                  <button
                    type="button"
                    onClick={() => onSelectContact(step.contactId!)}
                    className="text-left text-[14px] font-semibold text-ink hover:text-rose-gold-deep"
                  >
                    {step.contactName}
                  </button>
                ) : (
                  <p className="text-[14px] font-semibold text-ink">{step.contactName}</p>
                )}
                <p className="text-[13px] text-slate-text">{step.task}</p>
              </div>
              <span className="shrink-0 text-[12px] text-taupe">{step.when}</span>
            </li>
          ))}
        </ul>
        )}
      </LuxuryCard>

      <div className="lg:col-span-5">
        <div className="relative overflow-hidden rounded-[28px] border border-outline-variant/10 bg-ivory shadow-card">
          <div className="relative aspect-[4/5] min-h-[320px] sm:aspect-[16/12] lg:aspect-auto lg:min-h-[100%] lg:h-full">
            <Image
              src="/brand/heroes/analytics.jpg"
              alt="Laptop on a desk by a window"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 480px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory/80">
                Stay organized
              </p>
              <h3 className="mt-2 font-serif text-[24px] font-semibold leading-snug text-ivory sm:text-[26px]">
                Turn insights into opportunities
              </h3>
              <p className="mt-3 max-w-[var(--container-md)] text-[14px] leading-relaxed text-ivory/90">
                Pair listing alerts with personalized follow-ups so every client hears from you at
                the right moment.
              </p>
              <Link
                href="/dashboard/analytics"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-ivory px-5 py-2.5 text-[13px] font-medium text-ink"
              >
                View analytics
                <Icon name="arrow_forward" className="text-[16px]" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
