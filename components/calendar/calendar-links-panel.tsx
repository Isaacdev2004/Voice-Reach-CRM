"use client";
import { useEffect, useState } from "react";
import { useContacts } from "@/lib/hooks/use-contacts";
import type { CalendarPreferences } from "@/lib/calendar/preferences";
export function CalendarLinksPanel({ prefs }: { prefs: CalendarPreferences }) {
  const { contacts } = useContacts();
  const [contactId, setContactId] = useState("");
  const [enabled, setEnabled] = useState(false),
    [links, setLinks] = useState<
      {
        id: string;
        kind: string;
        active: boolean;
      }[]
    >([]),
    [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [title, setTitle] = useState("Client appointment");
  async function load() {
    try {
      const r = await fetch("/api/calendar/links", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw Error();
      setEnabled(d.enabled);
      setLinks(d.links ?? []);
    } catch {
      setError("Sharing configuration is unavailable.");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function create(kind: "feed" | "booking") {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/calendar/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          preferences: prefs,
          title,
          contactId: kind === "booking" ? contactId || null : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error();
      setUrl(location.origin + d.path);
      void load();
    } catch {
      setError("The private link could not be created.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <h3>Private sharing</h3>
      {enabled ? (
        <>
          <label className="block text-[11px]">
            Associate requests with a contact (optional)
            <select
              className="my-2 w-full rounded-lg border border-[#e8dfd3] p-2"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">No contact association</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.first_name, c.last_name].filter(Boolean).join(" ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[11px]">
            Booking appointment type
            <input
              className="my-2 w-full rounded-lg border border-[#e8dfd3] p-2"
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <button
            disabled={busy || !title.trim()}
            onClick={() => void create("booking")}
          >
            Create booking-request link
          </button>
          <p>
            Uses current working hours, timezone, duration, buffers, and notice.
            Requests require your review and confirmation.
          </p>
          <button disabled={busy} onClick={() => void create("feed")}>
            Create Apple read-only subscription
          </button>
          <p>
            Subscribe in Apple Calendar using the private URL. Busy times only;
            no contact details. No two-way Apple sync.
          </p>
          {url ? (
            <label className="block text-[11px]">
              Copy this private link now
              <input
                className="my-2 w-full rounded-lg border border-[#e8dfd3] p-2"
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
              />
            </label>
          ) : null}
          {links
            .filter((l) => l.active)
            .map((l) => (
              <div
                key={l.id}
                className="my-2 flex justify-between gap-2 text-[11px]"
              >
                <span>
                  {l.kind === "feed" ? "Read-only feed" : "Booking requests"}
                </span>
                <button
                  onClick={async () => {
                    const r = await fetch(`/api/calendar/links?id=${l.id}`, {
                      method: "DELETE",
                    });
                    if (r.ok) {
                      setUrl("");
                      void load();
                    } else setError("The link could not be revoked.");
                  }}
                >
                  Revoke
                </button>
              </div>
            ))}
        </>
      ) : (
        <p>
          Booking links and Apple read-only subscriptions need workspace
          configuration. No Apple account is connected.
        </p>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
