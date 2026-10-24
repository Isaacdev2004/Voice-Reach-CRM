"use client";
import { useAssistantRecord } from "@/components/assistant/use-record-context";
import { ContactReviewsPanel } from "@/components/reviews/contact-reviews-panel";

import { useId, useState, useRef } from "react";
import Link from "next/link";
import { AiLauncherButton } from "@/components/ai/ai-launcher-button";
import { ContactActivityTimeline } from "@/components/activity/contact-activity-timeline";
import { Icon } from "@/components/ui/icon";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import { contactSegment, segmentBadgeLabel } from "@/lib/contacts/lifecycle";
import { ContactNotesPanel } from "./contact-notes-panel";
import { ContactAvatar } from "./contact-avatar";
import { ComplianceBadge } from "./compliance-badge";

const TABS = ["Details", "Activity", "Notes", "AI Insights", "Reviews & Referrals"] as const;

export function ContactPreviewPanel({ contact, consent }: {
  contact: ApiContact;
  consent: "valid" | "pending" | "blocked" | "review";
}) {
  useAssistantRecord({ contactId: contact.id });
  const [tab, setTab] = useState<(typeof TABS)[number]>("Details");
  const tabId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const name = `${contact.first_name} ${contact.last_name ?? ""}`.trim();
  const tags = Array.isArray(contact.tags)
    ? contact.tags.filter(tag => typeof tag === "string" && tag.trim()) : [];

  return (
    <aside className="contact-preview" aria-label="Contact preview">
      <div className="contact-preview-heading">
        <ContactAvatar firstName={contact.first_name} lastName={contact.last_name} size="sm" />
        <div><h2>{name}</h2><p>{contact.email || contact.phone || "No contact details on file"}</p></div>
      </div>
      <div className="contact-preview-actions">
        {contact.phone ? <a href={`tel:${contact.phone}`} aria-label={`Call ${name}`}><Icon name="call" /></a> : null}
        {contact.email ? <a href={`mailto:${contact.email}`} aria-label={`Email ${name}`}><Icon name="mail" /></a> : null}
        <Link href={`/dashboard/contacts/${contact.id}`} aria-label={`Open profile for ${name}`}><Icon name="person" /></Link>
        <Link href={`/dashboard/tasks?new=task&contactId=${contact.id}`} aria-label={`Create task for ${name}`}><Icon name="add_task" /></Link><Link href={`/dashboard/tasks?tab=checklists&contactId=${contact.id}`} aria-label={`Transaction checklists for ${name}`}><Icon name="checklist" /></Link><AiLauncherButton contactId={contact.id} contactName={name} contactNotes={contact.notes ?? undefined} label="AI insights" />
      </div>
      <div className="contact-preview-tabs" role="tablist" aria-label="Contact information">
        {TABS.map((item, index) => (
          <button
            key={item}
            ref={node => { tabRefs.current[index] = node; }}
            type="button" role="tab" id={`${tabId}-${index}`}
            aria-controls={`${tabId}-panel`} aria-selected={tab === item}
            tabIndex={tab === item ? 0 : -1}
            onClick={() => setTab(item)}
            onKeyDown={event => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const next = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1
                : (index + (event.key === "ArrowRight" ? 1 : -1) + TABS.length) % TABS.length;
              setTab(TABS[next]);
              tabRefs.current[next]?.focus();
            }}
          >{item}</button>
        ))}
      </div>
      <div id={`${tabId}-panel`} role="tabpanel" aria-labelledby={`${tabId}-${TABS.indexOf(tab)}`}>
        {tab === "Details" ? (
          <>
            <dl>
              <dt>Phone</dt><dd>{contact.phone || "—"}</dd>
              <dt>Email</dt><dd>{contact.email || "—"}</dd>
              <dt>Type</dt><dd>{contact.type || "—"}</dd>
              <dt>Stage</dt><dd><span className="contacts-neutral-tag">{segmentBadgeLabel(contactSegment(contact.type))}</span></dd>
              <dt>Category</dt><dd>{contact.category || "—"}</dd>
              <dt>Source</dt><dd>{contact.source || "—"}</dd>
              {tags.length ? <><dt>Tags</dt><dd>{tags.join(", ")}</dd></> : null}
              <dt>Consent</dt><dd><ComplianceBadge status={consent} /></dd>
            </dl>
            <div className="contact-preview-notes">
              <h3>Notes</h3><p>{contact.notes || "No notes yet. Add context in the full profile."}</p>
            </div>
          </>
        ) : tab === "Activity" ? (
          <ContactActivityTimeline contactId={contact.id} contactName={name} />
        ) : tab === "Reviews & Referrals" ? (
          <ContactReviewsPanel key={contact.id} contactId={contact.id}/>
        ) : tab === "Notes" ? (
          <ContactNotesPanel contactId={contact.id} fallback={contact.notes ?? undefined} />
        ) : (
          <div className="contact-preview-ai">
            <h3>A thoughtful next step</h3>
            <p>Generate a follow-up draft using this contact&apos;s context.</p>
            <AiLauncherButton contactId={contact.id} contactName={name} contactNotes={contact.notes ?? undefined} label="Generate AI draft" />
          </div>
        )}
      </div>
      <Link className="contact-preview-open" href={`/dashboard/contacts/${contact.id}`}>
        Open full profile <Icon name="arrow_forward" className="text-[17px]" />
      </Link>
    </aside>
  );
}
