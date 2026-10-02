"use client";

import { trackMarketingEvent } from "@/lib/marketing/track";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { useState } from "react";

type ContactFormProps = {
  defaultSubject?: string;
};

export function ContactForm({ defaultSubject = "ARI inquiry" }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      message,
    ].join("\n");
    trackMarketingEvent("cta_click", { location: "contact-form", subject, event: "contact_form_submit" });
    const mailto = `mailto:${SITE_OFFER.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 space-y-5 rounded-2xl border border-outline-variant/15 bg-ivory p-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">Send a message</p>
        <p className="mt-2 text-[15px] text-slate-text">
          For onboarding, billing, or brokerage walkthroughs — we typically reply within one business day.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] font-medium text-ink">Name</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-rose-gold/50"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-ink">Email</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-rose-gold/50"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[13px] font-medium text-ink">Subject</span>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-rose-gold/50"
        >
          <option value="ARI inquiry">General inquiry</option>
          <option value="ARI onboarding help">Onboarding help</option>
          <option value="ARI brokerage demo">Brokerage demo / Team pricing</option>
          <option value="ARI billing question">Billing question</option>
        </select>
      </label>
      <label className="block">
        <span className="text-[13px] font-medium text-ink">Message</span>
        <textarea
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-rose-gold/50"
          placeholder="Tell us about your team, lead sources, or what you want to set up first."
        />
      </label>
      <button
        type="submit"
        className="inline-flex rounded-full bg-rose-gold px-8 py-3.5 text-[14px] font-semibold text-ivory transition-colors hover:bg-rose-gold-deep"
      >
        Send message
      </button>
    </form>
  );
}
