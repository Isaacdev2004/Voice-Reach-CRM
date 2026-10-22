"use client";

import Link from "next/link";
import { ComplianceBadge } from "@/components/crm/compliance-badge";
import { ContactAvatar } from "@/components/crm/contact-avatar";
import { Icon } from "@/components/ui/icon";
import type { ApiContact } from "@/lib/hooks/use-contacts";
import {
  contactSegment,
  segmentBadgeClass,
  segmentBadgeLabel,
} from "@/lib/contacts/lifecycle";
import { cn } from "@/lib/cn";

type ContactMobileListProps = {
  contacts: ApiContact[];
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  selectable: boolean;
  consentStatus: (c: ApiContact) => "valid" | "pending" | "blocked" | "review";
};

export function ContactMobileList({
  contacts,
  selected,
  onToggle,
  selectable,
  consentStatus,
}: ContactMobileListProps) {
  return (
    <ul className="divide-y divide-outline-variant/12 md:hidden">
      {contacts.map((contact) => {
        const seg = contactSegment(contact.type);
        const cat = contact.category?.trim();
        return (
          <li key={contact.id}>
            <div className="flex items-stretch gap-2 px-3 py-3 sm:px-4">
              {selectable ? (
                <button
                  type="button"
                  onClick={() => onToggle(contact.id)}
                  className="shrink-0 self-center rounded-full p-2 hover:bg-champagne"
                  aria-label={`Select ${contact.first_name}`}
                >
                  <Icon
                    name={selected[contact.id] ? "check_box" : "check_box_outline_blank"}
                    className="text-[22px] text-taupe"
                  />
                </button>
              ) : null}
              <Link
                href={`/dashboard/contacts/${contact.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <ContactAvatar
                  firstName={contact.first_name}
                  lastName={contact.last_name}
                  size="sm"
                  className="ring-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">
                    {contact.first_name} {contact.last_name ?? ""}
                  </p>
                  <p className="truncate text-[12px] text-slate-text">
                    {contact.phone || contact.email || "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {cat ? (
                      <span className="inline-flex rounded-lg bg-rose-gold/12 px-2 py-0.5 text-[11px] font-medium text-rose-gold-deep">
                        {cat}
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "inline-flex rounded-lg px-2 py-0.5 text-[11px] font-medium",
                        segmentBadgeClass(seg),
                      )}
                    >
                      {segmentBadgeLabel(seg)}
                    </span>
                    <ComplianceBadge status={consentStatus(contact)} compact />
                  </div>
                </div>
                <Icon name="chevron_right" className="shrink-0 text-[22px] text-taupe" />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
