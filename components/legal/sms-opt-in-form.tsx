"use client";

import Link from "next/link";
import { useState } from "react";
import { LEGAL_ENTITY } from "@/lib/legal/company";

export function SmsOptInForm() {
  const [agreed, setAgreed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <form
      id="opt-in"
      className="mt-8 space-y-4 rounded-xl border border-outline-variant/20 bg-ivory px-4 py-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!agreed) return;
        setAcknowledged(true);
      }}
    >
      <h2 className="font-serif text-[22px] font-semibold text-ink">SMS opt-in</h2>
      <p>
        Program: {LEGAL_ENTITY}. This box starts unchecked. No text is sent unless you check it
        and choose Save SMS consent.
      </p>
      <label className="block">
        Mobile number
        <input
          type="tel"
          name="mobile"
          autoComplete="tel"
          inputMode="tel"
          className="mt-1 w-full rounded-lg border border-outline-variant/30 bg-cream px-3 py-2 text-ink"
        />
      </label>
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="smsConsent"
          className="mt-1"
          checked={agreed}
          required
          onChange={(event) => {
            setAgreed(event.target.checked);
            setAcknowledged(false);
          }}
        />
        <span>
          I agree to receive SMS messages from {LEGAL_ENTITY} about appointments, listings, and
          follow-ups. Message frequency varies. Message and data rates may apply. Reply STOP to
          opt out. Reply HELP for help. See the{" "}
          <Link href="/privacy" className="text-rose-gold-deep underline">
            Privacy policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-rose-gold-deep underline">
            Terms of Service
          </Link>
          .
        </span>
      </label>
      <button
        type="submit"
        disabled={!agreed}
        className="rounded-full bg-rose-gold px-5 py-2 text-[14px] font-semibold text-ivory disabled:opacity-50"
      >
        Save SMS consent
      </button>
      {acknowledged ? (
        <p role="status">
          Consent choice confirmed on this page. No text message was sent.
        </p>
      ) : null}
    </form>
  );
}
