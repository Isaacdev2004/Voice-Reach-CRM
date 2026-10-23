"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Icon } from "@/components/ui/icon";
import { AiLauncherButton } from "@/components/ai/ai-launcher-button";
import { Modal } from "@/components/crm/modal";
import { ContactTaskModal } from "@/components/crm/contact-task-modal";
import { ContactNotesPanel } from "@/components/crm/contact-notes-panel";
import { rememberPropertyClient } from "@/lib/property-finder/criteria";
import type { ActivityItem } from "@/lib/activity/model";
export function ContactActivityTimeline({
  contactId,
  contactName = "this contact",
}: {
  contactId: string;
  contactName?: string;
}) {
  const { user } = useUser();
  return (
    <OwnedTimeline
      key={`${user?.id}:${contactId}`}
      ownerId={user?.id}
      contactId={contactId}
      contactName={contactName}
    />
  );
}
function OwnedTimeline({
  contactId,
  contactName,
  ownerId,
}: {
  contactId: string;
  contactName: string;
  ownerId?: string;
}) {
  const [timezone, setTimezone] = useState<string | undefined>();
  const [items, setItems] = useState<ActivityItem[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [limitations, setLimitations] = useState<string[]>([]),
    [action, setAction] = useState<"task" | "note" | "call" | null>(null),
    [saving, setSaving] = useState(false),
    [callNotes, setCallNotes] = useState(""),
    [outcome, setOutcome] = useState("Connected");
  const load = useCallback(
    async (next: string | null = null) => {
      setLoading(true);
      setError("");
      try {
        const r = await fetch(
          `/api/contacts/${contactId}/timeline${next ? "?cursor=" + encodeURIComponent(next) : ""}`,
          { cache: "no-store" },
        );
        const d = await r.json();
        if (!r.ok || d.success === false || !Array.isArray(d.items))
          throw Error();
        setItems((old) =>
          next
            ? [...new Map([...old, ...d.items].map((i) => [i.id, i])).values()]
            : d.items,
        );
        setCursor(d.nextCursor);
        setLimitations(d.limitations ?? []);
        setTimezone(d.timezone);
      } catch {
        setError(
          "Activity could not be loaded. Retry to see the latest records.",
        );
      } finally {
        setLoading(false);
      }
    },
    [contactId],
  );
  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    window.addEventListener("myari:activity-changed", refresh);
    window.addEventListener("myari:contacts-changed", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("myari:activity-changed", refresh);
      window.removeEventListener("myari:contacts-changed", refresh);
    };
  }, [load]);
  function changed() {
    setAction(null);
    void load();
    window.dispatchEvent(new Event("myari:activity-changed"));
  }
  const schedule = `/dashboard/calendar?new=event&contactId=${encodeURIComponent(contactId)}`;
  return (
    <div className="text-[12px] text-ink">
      <div className="mb-4 flex flex-wrap gap-2 [&>button]:rounded-full [&>button]:border [&>button]:border-[#e8dfd3] [&>button]:px-3 [&>button]:py-2 [&>a]:rounded-full [&>a]:border [&>a]:border-[#e8dfd3] [&>a]:px-3 [&>a]:py-2">
        <button onClick={() => setAction("task")}>Create task</button>
        <Link href={schedule}>Schedule follow-up</Link>
        <button onClick={() => setAction("call")}>Log a call</button>
        <button onClick={() => setAction("note")}>Add note</button>
        <Link href="/dashboard/campaigns">Review campaigns</Link>
        <Link
          href="/dashboard/properties"
          onClick={() => {
            if (ownerId)
              try {
                rememberPropertyClient(sessionStorage, ownerId, contactId);
              } catch {
                /* Selection can be made again in Property Finder. */
              }
          }}
        >
          Property search
        </Link>
        <AiLauncherButton
          contactId={contactId}
          contactName={contactName}
          label="Prepare message"
        />
        <button onClick={() => void load()}>Refresh activity</button>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-taupe">
        Records are linked by contact ID. Scheduled times do not establish
        attendance or delivery. Follow-up actions require your review.
      </p>
      {limitations.map((t) => (
        <p key={t} className="mb-2 text-[11px] text-taupe">
          {t}
        </p>
      ))}
      {error ? (
        <p role="alert" className="py-3 text-[#8b4039]">
          {error}
        </p>
      ) : null}
      {loading && !items.length ? (
        <p role="status">Loading activity…</p>
      ) : !items.length && !error ? (
        <p className="rounded-xl bg-[#f7f2ea] p-4 text-taupe">
          No linked activity has been recorded yet.
        </p>
      ) : (
        <ol>
          {items.map((item) => (
            <li
              key={item.id}
              className="relative mb-0 flex gap-3 border-b border-[#eee7de] py-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#f3ece1] text-[#96633f]">
                <Icon
                  name={
                    item.type === "appointment"
                      ? "event"
                      : item.type === "task"
                        ? "task_alt"
                        : item.type === "note"
                          ? "description"
                          : item.type === "campaign"
                            ? "campaign"
                            : item.type === "call" || item.type === "callback"
                              ? "call"
                              : item.type === "property"
                                ? "home"
                                : "history"
                  }
                  className="text-[18px]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <strong className="font-medium">{item.title}</strong>
                  <span className="rounded-full bg-[#f4eee5] px-2 py-0.5 text-[10px] text-[#715035]">
                    {item.status}
                  </span>
                </div>
                <time
                  className="mt-1 block text-[10px] text-taupe"
                  dateTime={item.at}
                >
                  {new Date(item.at).toLocaleString(undefined, {
                    timeZone: timezone,
                  })}
                </time>
                {item.scheduledAt ? (
                  <p className="mt-1 text-[11px] text-taupe">
                    Scheduled:{" "}
                    {new Date(item.scheduledAt).toLocaleString(undefined, {
                      timeZone: timezone,
                    })}
                  </p>
                ) : null}
                {item.detail ? (
                  <p className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed text-taupe">
                    {item.detail}
                  </p>
                ) : null}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="mt-2 inline-block text-[#96633f]"
                  >
                    Open record →
                  </Link>
                ) : null}
                {item.suggestion ? (
                  <div className="mt-2 rounded-xl bg-[#f7f2ea] p-3">
                    <p>{item.suggestion.text}</p>
                    {item.suggestion.action === "calendar" ? (
                      <Link href={schedule}>Schedule follow-up →</Link>
                    ) : item.suggestion.action === "task" ? (
                      <button onClick={() => setAction("task")}>
                        Create follow-up task →
                      </button>
                    ) : item.suggestion.action === "campaign" ? (
                      <Link href={item.href ?? "/dashboard/campaigns"}>
                        Review campaign engagement →
                      </Link>
                    ) : (
                      <Link
                        href="/dashboard/properties"
                        onClick={() => {
                          if (ownerId)
                            try {
                              rememberPropertyClient(
                                sessionStorage,
                                ownerId,
                                contactId,
                              );
                            } catch {
                              /* Optional. */
                            }
                        }}
                      >
                        Review property preferences →
                      </Link>
                    )}
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
      {cursor ? (
        <button
          className="mt-4 rounded-full border border-[#e8dfd3] px-4 py-2"
          disabled={loading}
          onClick={() => void load(cursor)}
        >
          {loading ? "Loading…" : "Load older activity"}
        </button>
      ) : null}
      {action === "task" ? (
        <ContactTaskModal
          open
          onClose={() => setAction(null)}
          showCalendarOption={false}
          saving={saving}
          onSave={async (input) => {
            setSaving(true);
            try {
              const r = await fetch(`/api/contacts/${contactId}/tasks`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...input, addToCalendar: false }),
              });
              if (!r.ok) throw Error("Task could not be saved.");
              changed();
            } catch {
              setError("Task could not be saved. Please retry.");
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}
      {action === "note" ? (
        <Modal open onClose={changed} title="Contact notes">
          <ContactNotesPanel contactId={contactId} />
        </Modal>
      ) : null}
      {action === "call" ? (
        <Modal
          open
          onClose={() => setAction(null)}
          title="Log a completed call"
          description="Records your manually entered outcome now. This does not place a call or send a message."
        >
          <form
            className="grid gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                const r = await fetch(`/api/contacts/${contactId}/calls`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ outcome, notes: callNotes }),
                });
                if (!r.ok) throw Error();
                setCallNotes("");
                changed();
              } catch {
                setError(
                  "Call could not be logged. Your notes remain in the form.",
                );
              } finally {
                setSaving(false);
              }
            }}
          >
            <label>
              Outcome
              <select
                className="mt-1 block w-full rounded-xl border border-[#e8dfd3] p-2"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                {[
                  "Connected",
                  "No answer",
                  "Voicemail left",
                  "Callback requested",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Notes
              <textarea
                className="mt-1 block w-full rounded-xl border border-[#e8dfd3] p-2"
                maxLength={2000}
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
              />
            </label>
            <button
              disabled={saving}
              className="rounded-full bg-[#9c6d49] px-4 py-3 text-white"
            >
              {saving ? "Saving…" : "Save call log"}
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
