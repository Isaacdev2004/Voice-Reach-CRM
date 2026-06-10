"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { phoneToTelUri } from "@/lib/phone";

type ContactQuickActionsProps = {
  email?: string | null;
  phone?: string | null;
  contactName?: string;
  className?: string;
};

export function ContactQuickActions({
  email,
  phone,
  contactName,
  className,
}: ContactQuickActionsProps) {
  const telUri = phoneToTelUri(phone);
  const smsUri = telUri ? `sms:${telUri}` : null;
  const mailto = email?.trim()
    ? `mailto:${email.trim()}?subject=${encodeURIComponent(`Following up — ${contactName ?? "VoiceReach"}`)}`
    : null;

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {telUri ? (
        <a
          href={`tel:${telUri}`}
          className="inline-flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory shadow-sm transition-opacity hover:opacity-90"
        >
          <Icon name="call" className="text-[18px]" />
          Call
        </a>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-5 py-2.5 text-[14px] text-taupe opacity-60">
          <Icon name="call" className="text-[18px]" />
          No phone
        </span>
      )}
      {smsUri ? (
        <a
          href={smsUri}
          className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-ivory px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-champagne"
        >
          <Icon name="sms" className="text-[18px] text-rose-gold-deep" />
          Text
        </a>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-5 py-2.5 text-[14px] text-taupe opacity-60">
          <Icon name="sms" className="text-[18px]" />
          No phone
        </span>
      )}
      {mailto ? (
        <a
          href={mailto}
          className="inline-flex items-center gap-2 rounded-full border border-outline-variant/40 bg-ivory px-5 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-champagne"
        >
          <Icon name="mail" className="text-[18px] text-rose-gold-deep" />
          Email
        </a>
      ) : (
        <span className="inline-flex items-center gap-2 rounded-full border border-outline-variant/30 px-5 py-2.5 text-[14px] text-taupe opacity-60">
          <Icon name="mail" className="text-[18px]" />
          No email
        </span>
      )}
    </div>
  );
}

export function ContactInfoLinks({
  email,
  phone,
  location,
}: {
  email?: string | null;
  phone?: string | null;
  location?: string | null;
}) {
  const telUri = phoneToTelUri(phone);

  return (
    <div className="mt-4 flex flex-wrap gap-4 text-[14px] text-slate-text">
      {email ? (
        <a
          href={`mailto:${email.trim()}`}
          className="flex items-center gap-1 transition-colors hover:text-rose-gold-deep"
        >
          <Icon name="mail" className="text-[18px] text-taupe" />
          {email}
        </a>
      ) : null}
      {phone && telUri ? (
        <a
          href={`tel:${telUri}`}
          className="flex items-center gap-1 transition-colors hover:text-rose-gold-deep"
        >
          <Icon name="phone" className="text-[18px] text-taupe" />
          {phone}
        </a>
      ) : phone ? (
        <span className="flex items-center gap-1">
          <Icon name="phone" className="text-[18px] text-taupe" />
          {phone}
        </span>
      ) : null}
      {location ? (
        <span className="flex items-center gap-1">
          <Icon name="location_on" className="text-[18px] text-taupe" />
          {location}
        </span>
      ) : null}
    </div>
  );
}
