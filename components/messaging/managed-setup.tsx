"use client";
import { useEffect, useState, type FormEvent } from "react";
import type { MessagingSetup } from "@/lib/messaging/setup-schema";
const EMPTY = {
  businessName: "",
  agentName: "",
  businessEmail: "",
  businessPhone: "",
  website: "",
  privacyUrl: "",
  termsUrl: "",
  address: "",
  country: "US" as const,
  businessType: "registered_business" as const,
  channels: ["sms", "email"] as MessagingSetup["channels"],
  useCase: "",
  consentDescription: "",
  consentAcknowledged: false,
};
const LABELS = {
  pending_verification: "Pending Verification",
  ready: "Ready",
  action_required: "Action Required",
};
type Snapshot = {
  registration?: { state: string; label: string; number: string | null };
  saved: { setup: MessagingSetup; savedAt: string } | null;
  channels: { channel: string; state: keyof typeof LABELS; reason: string }[];
};
export function ManagedMessagingSetup() {
  const [form, setForm] = useState<
    Omit<MessagingSetup, "consentAcknowledged"> & {
      consentAcknowledged: boolean;
    }
  >(EMPTY);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [busy, setBusy] = useState(true),
    [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/messaging/setup", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        if (active) {
          setSnapshot(data);
          if (data.saved) setForm(data.saved.setup);
        }
      })
      .catch(() => {
        if (active)
          setNotice(
            "Setup is unavailable or could not be loaded. Please retry before entering details.",
          );
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch("/api/messaging/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!r.ok) throw Error();
      const data = await r.json();
      setSnapshot((old) => (old ? { ...old, saved: data.saved } : old));
      setNotice(
        "Your setup details are saved. MyARI review is pending; sending remains disabled.",
      );
    } catch {
      setNotice(
        "We could not save these details. Your entries are still here; check the fields and retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  const field = (
    name:
      | "businessName"
      | "agentName"
      | "businessEmail"
      | "businessPhone"
      | "website"
      | "privacyUrl"
      | "termsUrl"
      | "address",
    label: string,
    type = "text",
  ) => (
    <label key={name} className="grid gap-2 text-sm text-ink">
      {label}
      <input
        required
        type={type}
        value={form[name]}
        maxLength={name.includes("Url") || name === "website" ? 500 : 300}
        onChange={(e) => setForm({ ...form, [name]: e.target.value })}
        className="min-h-11 rounded-xl border border-outline-variant/30 bg-white px-3 py-2 focus:outline-2 focus:outline-rose-gold"
      />
    </label>
  );
  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-rose-gold-deep">
          MyARI managed messaging
        </p>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">
          Your voice. Beautifully connected.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-text">
          Tell us about your business. MyARI manages provider setup and sender
          review—you do not need a Twilio, Resend or Slybroadcast account.
        </p>
      </header>
      <div className="grid gap-3 sm:grid-cols-3">
        {snapshot?.channels.map((c) => (
          <section
            key={c.channel}
            className="rounded-2xl border border-outline-variant/20 bg-white p-4"
          >
            <h2 className="font-serif text-xl capitalize">
              {c.channel === "sms" ? "SMS" : c.channel}
            </h2>
            <p className="mt-2 text-sm font-semibold text-rose-gold-deep">
              {LABELS[c.state]}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-text">
              {c.reason}
            </p>
          </section>
        ))}
      </div>
      <section
        aria-label="SMS registration"
        className="rounded-2xl border border-outline-variant/20 bg-white p-5"
      >
        <h2 className="font-serif text-2xl">Your dedicated SMS sender</h2>
        <p className="mt-2 font-semibold text-rose-gold-deep">
          {snapshot?.registration?.label || "Registration required"}
        </p>
        <p className="mt-2 text-sm text-slate-text">
          {snapshot?.registration?.number ||
            "No number assigned. Numbers are requested and reviewed separately; saving does not purchase one."}
        </p>
        <p className="mt-2 text-sm text-slate-text">
          Provider approval is independently verified. Your questionnaire cannot
          approve a brand or campaign. MyARI is your software provider; your
          authorized business is the sender.
        </p>
      </section>
      <form
        onSubmit={save}
        className="rounded-2xl border border-outline-variant/20 bg-white p-5 sm:p-6"
      >
        <fieldset disabled={busy || !snapshot} className="space-y-5">
          <h2 className="font-serif text-2xl">Business & sender details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("businessName", "Legal business or trading name")}
            {field("agentName", "Agent name")}
            {field("businessEmail", "Business email", "email")}
            {field("businessPhone", "Business phone (+country code)", "tel")}
            {field("website", "Business website", "url")}
            {field("address", "Business mailing address")}
            {field("privacyUrl", "Privacy policy URL", "url")}
            {field("termsUrl", "Terms URL", "url")}
          </div>
          <label className="grid gap-2 text-sm">
            Business type
            <select
              aria-label="Business type"
              value={form.businessType}
              onChange={(e) =>
                setForm({
                  ...form,
                  businessType: e.target
                    .value as MessagingSetup["businessType"],
                })
              }
              className="min-h-11 rounded-xl border border-outline-variant/30 bg-white px-3"
            >
              <option value="registered_business">Registered business</option>
              <option value="sole_proprietor">Sole proprietor</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm">
            Legally responsible sender
            <select
              aria-label="Legally responsible sender"
              value={form.responsibleParty || "agent"}
              onChange={(e) =>
                setForm({
                  ...form,
                  responsibleParty: e.target
                    .value as MessagingSetup["responsibleParty"],
                })
              }
              className="min-h-11 rounded-xl border border-outline-variant/30 bg-white px-3"
            >
              <option value="agent">Agent business</option>
              <option value="team">Team business</option>
              <option value="brokerage">Brokerage</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm">
              Brokerage affiliation (optional)
              <input
                value={form.brokerageName || ""}
                maxLength={160}
                onChange={(e) =>
                  setForm({ ...form, brokerageName: e.target.value })
                }
                className="min-h-11 rounded-xl border p-3"
              />
            </label>
            <label className="grid gap-2 text-sm">
              Public opt-in URL (optional)
              <input
                type="url"
                value={form.optInUrl || ""}
                onChange={(e) =>
                  setForm({ ...form, optInUrl: e.target.value || undefined })
                }
                className="min-h-11 rounded-xl border p-3"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm">
            Authority to message for this business
            <textarea
              maxLength={1000}
              value={form.authorizationDescription || ""}
              onChange={(e) =>
                setForm({ ...form, authorizationDescription: e.target.value })
              }
              className="rounded-xl border p-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            Representative messages
            <textarea
              maxLength={1200}
              value={form.messageSamples || ""}
              onChange={(e) =>
                setForm({ ...form, messageSamples: e.target.value })
              }
              className="rounded-xl border p-3"
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm">
              Channels you would like to use
            </legend>
            <div className="flex flex-wrap gap-4">
              {(["sms", "email", "voicemail"] as const).map((channel) => (
                <label
                  key={channel}
                  className="flex min-h-11 items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.channels.includes(channel)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        channels: e.target.checked
                          ? [...form.channels, channel]
                          : form.channels.filter((x) => x !== channel),
                      })
                    }
                  />
                  {channel === "sms"
                    ? "SMS"
                    : channel === "email"
                      ? "Email"
                      : "Voicemail (subject to provider approval)"}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-2 text-sm">
            What will you send?
            <textarea
              required
              minLength={20}
              maxLength={1200}
              rows={3}
              value={form.useCase}
              onChange={(e) => setForm({ ...form, useCase: e.target.value })}
              className="rounded-xl border border-outline-variant/30 p-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            How do your contacts give permission?
            <textarea
              required
              minLength={20}
              maxLength={1200}
              rows={3}
              value={form.consentDescription}
              onChange={(e) =>
                setForm({ ...form, consentDescription: e.target.value })
              }
              className="rounded-xl border border-outline-variant/30 p-3"
            />
          </label>
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input
              required
              type="checkbox"
              checked={form.consentAcknowledged}
              onChange={(e) =>
                setForm({ ...form, consentAcknowledged: e.target.checked })
              }
              className="mt-1"
            />
            I will send only with appropriate permission, respect opt-outs and
            complete MyARI’s sender-registration review before sending.
          </label>
          <p className="text-sm text-slate-text">
            US setup is supported in this first phase. Do not enter provider
            credentials, tax IDs or Social Security numbers here. Saving this
            questionnaire does not purchase a number, register a paid campaign,
            approve a sender or start delivery.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              disabled={busy || !snapshot}
              className="min-h-11 rounded-full bg-rose-gold-deep px-6 py-3 text-sm text-white disabled:opacity-50"
            >
              {busy ? "Please wait…" : "Save setup details"}
            </button>
            {snapshot?.saved ? (
              <span className="text-sm text-taupe">
                Saved {new Date(snapshot.saved.savedAt).toLocaleDateString()}
              </span>
            ) : null}
          </div>
          <p
            role="status"
            aria-live="polite"
            className="text-sm text-slate-text"
          >
            {notice}
          </p>
        </fieldset>
      </form>
      {!snapshot && !busy ? (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-11 rounded-full border border-outline-variant/30 px-5 text-sm"
        >
          Retry loading setup
        </button>
      ) : null}
    </main>
  );
}
