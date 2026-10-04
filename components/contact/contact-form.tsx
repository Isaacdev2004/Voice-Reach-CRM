"use client";

import { trackMarketingEvent } from "@/lib/marketing/track";
import { SITE_OFFER } from "@/lib/marketing/site-offer";
import { useState } from "react";

type ContactFormProps = {
  defaultSubject?: string;
};

type FormStatus = "idle" | "submitting" | "success" | "error";

export function ContactForm({ defaultSubject = "ARI inquiry" }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const isBrokerageDemo = subject.toLowerCase().includes("brokerage");
    trackMarketingEvent(isBrokerageDemo ? "brokerage_demo_request" : "contact_form_submit", {
      location: "contact-form",
      subject,
    });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        ok?: boolean;
        error?: string;
      };

      if (response.ok && (json.ok || json.success)) {
        setStatus("success");
        setName("");
        setEmail("");
        setMessage("");
        return;
      }

      if (response.status === 503) {
        const body = [`Name: ${name}`, `Email: ${email}`, "", message].join("\n");
        const mailto = `mailto:${SITE_OFFER.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
        return;
      }

      setErrorMessage(json.error || "Something went wrong. Please email us directly.");
      setStatus("error");
    } catch {
      setErrorMessage(`Could not send. Email us at ${SITE_OFFER.supportEmail}.`);
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="mt-10 rounded-2xl border border-sage/30 bg-ivory p-8 text-center"
        role="status"
        aria-live="polite"
      >
        <p className="font-serif text-[22px] font-semibold text-ink">Message sent</p>
        <p className="mt-2 text-[15px] text-slate-text">
          Thanks - we typically reply within one business day to {SITE_OFFER.supportEmail}.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 text-[14px] font-semibold text-rose-gold-deep hover:underline"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="mt-10 space-y-5 rounded-2xl border border-outline-variant/15 bg-ivory p-8"
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-taupe">Send a message</p>
        <p className="mt-2 text-[15px] text-slate-text">
          For onboarding, billing, or brokerage walkthroughs - we typically reply within one business day.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] font-medium text-ink">Name</span>
          <input
            required
            id="contact-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-rose-gold/50 focus:ring-2 focus:ring-rose-gold/20"
          />
        </label>
        <label className="block">
          <span className="text-[13px] font-medium text-ink">Email</span>
          <input
            required
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-rose-gold/50 focus:ring-2 focus:ring-rose-gold/20"
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[13px] font-medium text-ink">Subject</span>
        <select
          id="contact-subject"
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-rose-gold/50 focus:ring-2 focus:ring-rose-gold/20"
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
          id="contact-message"
          name="message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-rose-gold/50 focus:ring-2 focus:ring-rose-gold/20"
          placeholder="Tell us about your team, lead sources, or what you want to set up first."
        />
      </label>
      {status === "error" && errorMessage ? (
        <p className="text-[14px] text-red-700" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex rounded-full bg-rose-gold px-8 py-3.5 text-[14px] font-semibold text-ivory transition-colors hover:bg-rose-gold-deep disabled:opacity-60"
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
