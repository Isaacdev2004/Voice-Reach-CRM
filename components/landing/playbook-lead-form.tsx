"use client";

import { useRef, useState } from "react";
import { trackMarketingEvent } from "@/lib/marketing/track";

type PlaybookLeadFormProps = {
  className?: string;
};

export function PlaybookLeadForm({ className = "" }: PlaybookLeadFormProps) {
  const requestId = useRef<string | null>(null);
  const submitting = useRef(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    requestId.current ??= crypto.randomUUID();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/playbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, requestId: requestId.current }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
        ok?: boolean;
        delivery?: string;
      };
      if (
        !res.ok ||
        data.success !== true ||
        data.ok !== true ||
        data.delivery !== "accepted"
      ) {
        throw new Error(
          "We couldn’t complete your request. Please try again shortly.",
        );
      }
      trackMarketingEvent("contact_form_submit", {
        location: "playbook",
        type: "playbook",
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div
        className={`rounded-2xl border border-sage/30 bg-sage/10 px-6 py-8 ${className}`}
      >
        <p className="font-serif text-[22px] font-semibold text-ink">
          Your playbook email is queued.
        </p>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-text">
          Your contact details were submitted and your playbook attachment was
          accepted for email delivery. Check your inbox and spam folder. If it
          doesn&apos;t arrive in a few minutes, email{" "}
          <a
            href="mailto:hello@myari.io"
            className="font-medium text-rose-gold-deep hover:underline"
          >
            hello@myari.io
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className={`rounded-2xl border border-outline-variant/15 bg-ivory p-6 md:p-8 ${className}`}
    >
      <label className="block text-[13px] font-semibold text-ink">
        Name
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-outline-variant/20 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-rose-gold/50"
          autoComplete="name"
        />
      </label>
      <label className="mt-4 block text-[13px] font-semibold text-ink">
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-outline-variant/20 bg-cream px-4 py-3 text-[15px] text-ink outline-none focus:border-rose-gold/50"
          autoComplete="email"
        />
      </label>
      {error ? (
        <p className="mt-3 text-[13px] text-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-full bg-rose-gold px-6 py-3.5 text-[15px] font-bold text-ivory disabled:opacity-60"
      >
        {loading ? "Sending…" : "Send me the playbook"}
      </button>
      <p className="mt-3 text-center text-[12px] text-taupe">
        We’ll use these details to email your requested playbook. Prefer a live
        walkthrough?{" "}
        <a href="/contact" className="text-rose-gold-deep hover:underline">
          Book a demo
        </a>
        .
      </p>
    </form>
  );
}
