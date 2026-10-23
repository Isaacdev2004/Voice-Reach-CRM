"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
type Message = {
  id: string;
  provider_id: string;
  kind: string;
  contact_id: string | null;
  from_number: string;
  to_number: string;
  body: string;
  status: string;
  callEvidence?: {label:string;duration:number|null};
  classification: string;
  duration: number | null;
  received_at: string;
};
export function ConversationInbox() {
  const [outbound, setOutbound] = useState<
    {
      id: string;
      contact_id: string | null;
      body: string | null;
      status: string;
      created_at: string;
    }[]
  >([]);
  const [messages, setMessages] = useState<Message[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState(""),
    [query, setQuery] = useState("");
  useEffect(() => {
    let live = true;
    void fetch("/api/communications")
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw Error();
        if (live) {
          setMessages(j.messages ?? []);
          setOutbound(j.outbound ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (live) {
          setError(
            "Conversations are unavailable. Verify the Communications database update and verified number routing.",
          );
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, []);
  const people = [
    ...new Set(
      messages
        .filter((m) =>
          `${m.from_number} ${m.body}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .map((m) => m.from_number),
    ),
  ];
  const thread = messages
    .filter((m) => m.from_number === selected)
    .sort((a, b) => a.received_at.localeCompare(b.received_at));
  const contact = thread.find((m) => m.contact_id)?.contact_id;
  const classify = async (id: string, classification: string) => {
    const r = await fetch("/api/communications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, classification }),
    });
    if (r.ok)
      setMessages((old) =>
        old.map((m) => (m.id === id ? { ...m, classification } : m)),
      );
    else setError("Classification could not be saved.");
  };
  return (
    <section className="ac-conversation">
      <aside>
        <h2>Conversation inbox</h2>
        <input
          aria-label="Search conversations"
          placeholder="Search numbers or messages…"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {people.map((p) => (
          <button
            key={p}
            aria-pressed={selected === p}
            onClick={() => setSelected(p)}
          >
            {p}
            <small>
              {messages.filter((m) => m.from_number === p).length} recorded
              interactions
            </small>
          </button>
        ))}
      </aside>
      <main>
        {loading ? (
          <p>Loading conversations…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : !selected ? (
          <p>
            Select a conversation. Only recorded Twilio interactions appear
            here.
          </p>
        ) : (
          <>
            <h2>{selected}</h2>
            {thread.map((m) => (
              <article key={m.id}>
                <p>
                  {m.kind === "call"
                    ? `Call · ${m.callEvidence?.label ?? "Outcome unverified"}${(m.callEvidence?.duration ?? m.duration) != null ? ` · ${m.callEvidence?.duration ?? m.duration} seconds (recorded leg)` : ""}`
                    : m.body}
                </p>
                <small>
                  {new Date(m.received_at).toLocaleString()} · {m.status} ·{" "}
                  {m.to_number}
                </small>
                {m.kind === "sms" && (
                  <label>
                    Suggested classification · review and correct
                    <select
                      value={m.classification}
                      onChange={(e) => void classify(m.id, e.target.value)}
                    >
                      {[
                        "Interested",
                        "Appointment request",
                        "Question",
                        "Not interested",
                        "Opt-out",
                        "Needs review",
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </label>
                )}
              </article>
            ))}
            {contact &&
              outbound
                .filter((m) => m.contact_id === contact)
                .map((m) => (
                  <article key={m.id} className="ac-outbound">
                    <strong>Outbound SMS</strong>
                    <p>{m.body || "Message body was not retained."}</p>
                    <small>
                      {new Date(m.created_at).toLocaleString()} · {m.status}
                    </small>
                  </article>
                ))}
            <p>
              Classifications are keyword suggestions, not AI-verified facts.
              Editing them does not change consent or automatically contact
              anyone.
            </p>
            <div className="ac-detail-actions">
              {contact ? (
                <>
                  <Link href={`/dashboard/contacts/${contact}`}>
                    Open contact and existing communication actions
                  </Link>
                  <Link href={`/dashboard/tasks?contactId=${contact}&new=1`}>
                    Create follow-up task
                  </Link>
                  <Link href={`/dashboard/calendar?contactId=${contact}`}>
                    Schedule callback
                  </Link>
                </>
              ) : (
                <p>
                  No unique contact match. Review the sender before associating
                  this conversation.
                </p>
              )}
            </div>
            <p>
              Outgoing SMS remains in the existing authorized workflow. This
              inbox does not bypass sender, consent, suppression, or billing
              safeguards.
            </p>
          </>
        )}
      </main>
    </section>
  );
}
