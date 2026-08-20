"use client";

import { AiLauncherButton } from "@/components/ai/ai-launcher-button";
import Link from "next/link";
import { AiSuggestionPanel } from "@/components/crm/ai-suggestion-panel";
import { ComplianceBadge } from "@/components/crm/compliance-badge";
import { ContactAvatar } from "@/components/crm/contact-avatar";
import { ContactInfoLinks, ContactQuickActions } from "@/components/crm/contact-quick-actions";
import { ContactNotesPanel } from "@/components/crm/contact-notes-panel";
import { ContactTasksPanel } from "@/components/crm/contact-tasks-panel";
import { EditContactModal } from "@/components/crm/edit-contact-modal";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { RelationshipTag } from "@/components/crm/relationship-tag";
import { Timeline } from "@/components/crm/timeline";
import { EngagementTimeline } from "@/components/engagement/engagement-timeline";
import { Icon } from "@/components/ui/icon";
import { isUuid } from "@/lib/contacts/is-uuid";
import { contactProfileFromApi, DEMO_CONTACT } from "@/lib/crm/mock-data";
import type { ContactProfile } from "@/lib/crm/types";
import { useContact } from "@/lib/hooks/use-contacts";
import { useState } from "react";

type RelationshipProfilePageProps = {
  contactId: string;
};

function profileFromId(contactId: string, apiContact: ReturnType<typeof useContact>["contact"]): ContactProfile {
  if (apiContact) return contactProfileFromApi(apiContact);
  if (contactId === DEMO_CONTACT.id) return DEMO_CONTACT;
  return contactProfileFromApi({
    id: contactId,
    first_name: "Contact",
    last_name: "",
  });
}

export function RelationshipProfilePage({ contactId }: RelationshipProfilePageProps) {
  const { contact: apiContact, loading, error, refresh } = useContact(contactId);
  const [editOpen, setEditOpen] = useState(false);
  const profile = profileFromId(contactId, apiContact);
  const isDemo = !isUuid(contactId);
  const consentStatus =
    apiContact?.consent_records?.[0]?.status === "Yes"
      ? "valid"
      : apiContact?.dnc
        ? "blocked"
        : "pending";

  if (loading) {
    return (
      <div className="luxury-page flex min-h-[50vh] items-center justify-center p-8">
        <p className="text-taupe">Loading relationship…</p>
      </div>
    );
  }

  return (
    <div className="luxury-page p-8 max-w-[1400px] w-full mx-auto space-y-8">
      <Link
        href="/dashboard/contacts"
        className="inline-flex items-center gap-1 text-[14px] text-taupe transition-colors hover:text-rose-gold-deep"
      >
        <Icon name="arrow_back" className="text-[18px]" />
        Back to contacts
      </Link>

      {isDemo ? (
        <p className="rounded-2xl bg-champagne px-4 py-3 text-[14px] text-taupe">
          Sample profile for preview.{" "}
          <Link href="/dashboard/contacts" className="font-medium text-rose-gold-deep hover:underline">
            Open a real contact
          </Link>{" "}
          from your list to save tasks and sync live data.
        </p>
      ) : null}

      <LuxuryCard padding="lg" className="luxury-gradient-hero">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex shrink-0 flex-col items-center gap-4 lg:items-start">
            <ContactAvatar
              firstName={profile.firstName}
              lastName={profile.lastName}
              size="lg"
            />
            <ComplianceBadge status={consentStatus} />
            <p className="text-center text-[13px] font-medium text-emerald-muted lg:text-left">
              {profile.leadStatus}
            </p>
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {profile.tags.map((tag, i) => (
                <RelationshipTag
                  key={tag}
                  label={tag}
                  variant={i % 3 === 0 ? "sage" : i % 3 === 1 ? "cream" : "bronze"}
                />
              ))}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">
              Relationship profile
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-[40px] font-semibold leading-tight text-ink">
                {profile.firstName} {profile.lastName}
                <Icon name="star" className="ml-2 inline text-[28px] text-bronze" />
              </h1>
              {apiContact ? (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="rounded-full border border-outline-variant/30 px-4 py-2 text-[13px] font-medium text-ink hover:bg-champagne"
                >
                  Edit contact
                </button>
              ) : null}
            </div>
            {profile.title ? (
              <p className="mt-1 text-[13px] font-semibold uppercase tracking-wider text-taupe">
                {profile.title}
              </p>
            ) : null}
            <ContactInfoLinks
              email={profile.email}
              phone={profile.phone}
              location={profile.location}
            />
            <ContactQuickActions
              email={profile.email}
              phone={profile.phone}
              contactName={`${profile.firstName} ${profile.lastName}`}
              className="mt-5"
            />
            {profile.quote ? (
              <blockquote className="mt-6 border-l-2 border-rose-gold/40 pl-4 font-serif text-[20px] italic leading-relaxed text-ink/90">
                &ldquo;{profile.quote}&rdquo;
              </blockquote>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="rounded-full bg-bronze px-6 py-2.5 text-[14px] font-medium text-ivory transition-opacity hover:opacity-90"
              >
                Edit contact
              </button>
              <AiLauncherButton
                contactName={`${profile.firstName} ${profile.lastName}`}
                contactNotes={profile.notes}
                goal={profile.leadStatus}
                label="AI follow-up"
              />
              <button
                type="button"
                className="rounded-full border border-outline-variant/40 px-4 py-2.5 text-taupe transition-colors hover:bg-champagne"
                aria-label="More options"
              >
                <Icon name="more_horiz" />
              </button>
            </div>
          </div>

          {profile.relationshipScore > 0 ? (
            <div className="text-center lg:text-right">
              <p className="text-[12px] uppercase tracking-wider text-taupe">Relationship score</p>
              <p className="font-serif text-[48px] font-semibold text-rose-gold-deep">
                {profile.relationshipScore}
              </p>
            </div>
          ) : null}
        </div>
      </LuxuryCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <LuxuryCard padding="lg" className="lg:col-span-5">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-[22px] font-semibold text-ink">Relationship timeline</h2>
            {apiContact ? (
              <span className="rounded-full bg-emerald-muted/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-muted">
                Live engagement
              </span>
            ) : null}
          </div>
          {apiContact ? (
            <EngagementTimeline contactId={apiContact.id} />
          ) : (
            <Timeline events={profile.timeline} />
          )}
        </LuxuryCard>

        <div className="lg:col-span-4 space-y-6">
          <ContactNotesPanel contactId={contactId} fallback={profile.notes} isDemo={isDemo} />

          <LuxuryCard padding="lg">
            <h2 className="mb-4 font-serif text-[20px] font-semibold text-ink">Contact details</h2>
            <dl className="space-y-3">
              {profile.details.map((d) => (
                <div key={d.label} className="flex justify-between border-b border-outline-variant/15 pb-2 text-[14px]">
                  <dt className="text-taupe">{d.label}</dt>
                  <dd className="font-medium text-ink">{d.value}</dd>
                </div>
              ))}
            </dl>
          </LuxuryCard>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <ContactTasksPanel
            contactId={contactId}
            demoTasks={profile.tasks}
            isDemo={isDemo}
          />

          <LuxuryCard padding="lg">
            <h2 className="mb-4 font-serif text-[20px] font-semibold text-ink">Engagement signals</h2>
            <ul className="space-y-4">
              {profile.signals.map((sig) => (
                <li key={sig.id} className="flex gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sage-light text-emerald-muted">
                    <Icon name={sig.icon} className="text-[18px]" />
                  </div>
                  <div>
                    <p className="font-medium text-ink">{sig.label}</p>
                    <p className="text-[13px] text-slate-text">{sig.description}</p>
                    <p className="text-[12px] text-taupe">{sig.date}</p>
                  </div>
                </li>
              ))}
            </ul>
          </LuxuryCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AiSuggestionPanel
          title="AI suggestions for this relationship"
          suggestions={profile.aiSuggestions}
        />
        <LuxuryCard padding="lg">
          <h2 className="mb-4 font-serif text-[22px] font-semibold text-ink">Campaign enrollment</h2>
          <ul className="space-y-2">
            {profile.enrolledCampaigns.map((name) => (
              <li
                key={name}
                className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 text-[14px]"
              >
                <span className="font-medium text-ink">{name}</span>
                <Link href="/dashboard/campaigns" className="text-rose-gold-deep text-[13px]">
                  View →
                </Link>
              </li>
            ))}
          </ul>
        </LuxuryCard>
      </div>

      <EditContactModal
        contact={apiContact}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => void refresh()}
      />
    </div>
  );
}
