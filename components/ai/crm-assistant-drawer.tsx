"use client";
import { LegacyAiDraftGenerator } from "./legacy-draft-generator";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useAiAssistant } from "./ai-assistant-context";
import {
  HANDOFFS,
  type Action,
  type Reference,
  type PageContext,
} from "@/lib/ai/assistant/schema";
import "./crm-assistant.css";
type Proposal = {
  id: string;
  payload: Action;
  status: "proposed" | "approved" | "saved" | "dismissed";
  record_id?: string;
};
type Message = {
  id: string;
  role: string;
  content: string;
  result?: { sources?: Reference[] };
};
type Briefing = {
  sections: {
    title: string;
    available: boolean;
    limited?: boolean;
    note?: string;
    items: {
      id: string;
      title: string;
      date?: string;
      href: string;
      overdue?: boolean;
    }[];
  }[];
  limitations: string[];
};
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(55000),
  });
  const body = await r.json();
  if (!r.ok || !body.success)
    throw Error(
      r.status === 429
        ? "Your assistant usage limit has been reached. Please try again later."
        : "The assistant couldn't complete this request. Please retry. Your work has been preserved.",
    );
  return body.data as T;
}
export function CrmAssistantDrawer() {
  const { user } = useUser();
  return <AssistantSession key={user?.id ?? "signed-out"} owner={user?.id} />;
}
function AssistantSession({ owner }: { owner?: string }) {
  const { state, closeAssistant } = useAiAssistant(),
    page = usePathname();
  const [edits, setEdits] = useState<Record<string, Action>>({});
  const [writing, setWriting] = useState(false);
  const [wide, setWide] = useState(false),
    [conversation, setConversation] = useState<string>(),
    [history, setHistory] = useState<{ id: string; title: string }[]>([]),
    [messages, setMessages] = useState<Message[]>([]),
    [proposals, setProposals] = useState<Proposal[]>([]),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [briefing, setBriefing] = useState<Briefing>(),
    [mounted, setMounted] = useState(false),
    [confirm, setConfirm] = useState<string>();
  const pendingRequest = useRef<{ key: string; id: string } | undefined>(
    undefined,
  );
  const panel = useRef<HTMLElement>(null),
    generation = useRef(0);
  useEffect(() => {
    setMounted(true);
    const counter = generation;
    return () => {
      counter.current++;
    };
  }, []);
  useEffect(() => {
    if (!state.open || !owner) return;
    let current = true;
    api<{ conversations: typeof history }>("/api/ai/assistant")
      .then((r) => {
        if (current) setHistory(r.conversations);
      })
      .catch(() => {
        if (current)
          setError("Conversation history is unavailable. Please retry later.");
      });
    return () => {
      current = false;
    };
  }, [state.open, owner]);
  useEffect(() => {
    if (!state.open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button")?.focus();
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAssistant();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),textarea,select,a[href]",
        ) ?? [],
      ).filter((n) => n.getClientRects().length);
      const first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, [state.open, closeAssistant]);
  const context = (): PageContext => {
    const c: PageContext = {
      page: page.startsWith("/dashboard") ? page : "/dashboard",
    };
    // Only stable identifiers, never browser-supplied names, notes or calculations.
    const q = new URLSearchParams(window.location.search),
      segments = page.split("/");
    for (const key of [
      "contactId",
      "campaignId",
      "taskId",
      "noteId",
      "scriptId",
    ] as const) {
      const value =
        (state.launchPage === page ? state.context[key] : undefined) ??
        (state.recordContext?.page === page
          ? state.recordContext[key]
          : undefined) ??
        q.get(key);
      if (value && /^[a-f\d-]{36}$/i.test(value)) c[key] = value;
    }
    if (segments[2] === "contacts" && /^[a-f\d-]{36}$/i.test(segments[3] ?? ""))
      c.contactId = segments[3];
    if (
      segments[2] === "campaigns" &&
      /^[a-f\d-]{36}$/i.test(segments[3] ?? "")
    )
      c.campaignId = segments[3];
    return c;
  };
  const load = async (id: string) => {
    if (busy) return;
    const attempt = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ turns: Message[]; proposals: Proposal[] }>(
        `/api/ai/assistant?conversationId=${id}`,
      );
      if (attempt !== generation.current) return;
      setConversation(id);
      setMessages(r.turns);
      setProposals(r.proposals);
      setBriefing(undefined);
    } catch {
      if (attempt === generation.current)
        setError("Conversation could not be loaded. Please retry.");
    } finally {
      if (attempt === generation.current) setBusy(false);
    }
  };
  const send = async () => {
    if (busy || !text.trim() || !owner) return;
    const attempt = ++generation.current,
      input = text.trim();
    const requestKey = JSON.stringify([conversation, input, context()]);
    if (pendingRequest.current?.key !== requestKey)
      pendingRequest.current = { key: requestKey, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const r = await api<{
        conversationId: string;
        reply: { answer: string; sources: Reference[] };
        proposals: Proposal[];
      }>("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: pendingRequest.current.id,
          conversationId: conversation,
          message: input,
          context: context(),
        }),
      });
      if (attempt !== generation.current) return;
      setConversation(r.conversationId);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", content: input },
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: r.reply.answer,
          result: { sources: r.reply.sources },
        },
      ]);
      setProposals((prev) => [
        ...prev.filter((p) => !r.proposals.some((n) => n.id === p.id)),
        ...r.proposals,
      ]);
      setText("");
      pendingRequest.current = undefined;
      setHistory((h) =>
        h.some((c) => c.id === r.conversationId)
          ? h
          : [{ id: r.conversationId, title: input.slice(0, 80) }, ...h],
      );
    } catch (e) {
      if (attempt === generation.current)
        setError(e instanceof Error ? e.message : "Request unavailable.");
    } finally {
      if (attempt === generation.current) setBusy(false);
    }
  };
  const decide = async (p: Proposal, approve: boolean) => {
    if (busy) return;
    const attempt = generation.current;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ proposal: Proposal }>("/api/ai/assistant/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, approve }),
      });
      if (attempt !== generation.current) return;
      setProposals((prev) => prev.map((v) => (v.id === p.id ? r.proposal : v)));
      setConfirm(undefined);
      window.dispatchEvent(new Event("myari-assistant-record-saved"));
    } catch {
      if (attempt === generation.current)
        setError(
          "Could not save the proposal. Refresh before retrying; the server prevents duplicate saves.",
        );
    } finally {
      if (attempt === generation.current) setBusy(false);
    }
  };
  const revise = async (p: Proposal) => {
    if (busy || !edits[p.id]) return;
    const attempt = generation.current;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ proposal: Proposal }>("/api/ai/assistant/actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          expected: p.payload,
          payload: edits[p.id],
        }),
      });
      if (attempt !== generation.current) return;
      setProposals((prev) => prev.map((v) => (v.id === p.id ? r.proposal : v)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      setConfirm(undefined);
    } catch {
      if (attempt === generation.current)
        setError(
          "Draft changes could not be saved. Reload the conversation if it was already approved.",
        );
    } finally {
      if (attempt === generation.current) setBusy(false);
    }
  };
  const brief = async () => {
    setBusy(true);
    setError("");
    const attempt = generation.current;
    try {
      const r = await api<Briefing>("/api/ai/assistant/briefing");
      if (attempt === generation.current) setBriefing(r);
    } catch {
      if (attempt === generation.current)
        setError("Daily briefing is unavailable.");
    } finally {
      if (attempt === generation.current) setBusy(false);
    }
  };
  if (!mounted || !state.open) return null;
  if (writing)
    return (
      <>
        <button
          style={{
            position: "fixed",
            top: 12,
            right: 16,
            zIndex: 10020,
            background: "#fffdf9",
            padding: 12,
            borderRadius: 20,
          }}
          onClick={() => setWriting(false)}
        >
          ← Back to assistant
        </button>
        <LegacyAiDraftGenerator />
      </>
    );
  const suggestions = page.includes("contacts")
    ? [
        "Summarize the selected lead using recorded activity",
        "Prepare a follow-up email draft",
      ]
    : page.includes("campaigns")
      ? [
          "Review the selected campaign sequence",
          "Show actual campaign delivery statistics",
        ]
      : page.includes("mortgage")
        ? ["Prepare a mortgage comparison request; ask me for missing inputs"]
        : page.includes("voice")
          ? ["Review the selected voice script draft"]
          : [
              "Show my upcoming appointments",
              "Help organize my follow-up tasks",
            ];
  return createPortal(
    <aside
      ref={panel}
      className={`myari-assistant ${wide ? "wide" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-myari-title"
    >
      <header>
        <div style={{ flex: 1 }}>
          <small>YOUR CRM ASSISTANT</small>
          <h2 id="ask-myari-title">Ask MyARI</h2>
          <small>Thoughtful guidance. Every action in your control.</small>
        </div>
        <button
          onClick={() => setWide(!wide)}
          aria-label={wide ? "Collapse assistant" : "Expand assistant"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
          </svg>
        </button>
        <button onClick={closeAssistant} aria-label="Close assistant">
          ✕
        </button>
      </header>
      <nav className="assistant-controls" aria-label="Assistant conversations">
        <select
          aria-label="Conversation history"
          value={conversation ?? ""}
          disabled={busy}
          onChange={(e) => e.target.value && void load(e.target.value)}
        >
          <option value="">Conversation history</option>
          {history.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <button
          disabled={busy}
          onClick={() => {
            generation.current++;
            setConversation(undefined);
            setMessages([]);
            setProposals([]);
            setConfirm(undefined);
            setBriefing(undefined);
            setError("");
          }}
        >
          New conversation
        </button>
        <button disabled={busy} onClick={() => void brief()}>
          Daily briefing
        </button>
        <button disabled={busy} onClick={() => setWriting(true)}>
          Writing tools
        </button>
      </nav>
      <div className="assistant-scroll">
        <small>
          Context:{" "}
          {page.split("/").filter(Boolean).slice(1).join(" / ") || "Dashboard"}{" "}
          · Authorized records only
        </small>
        {!messages.length && (
          <div className="assistant-message">
            <p>How can I help move your day forward?</p>
            <p>
              Ask about your CRM or prepare an action for review. I won’t send
              messages or change live campaigns.
            </p>
            <div className="assistant-suggestions">
              {suggestions.map((s) => (
                <button key={s} onClick={() => setText(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {briefing && (
          <section className="assistant-briefing">
            <h3>Your business briefing</h3>
            <small>Recorded CRM evidence · refreshed on request</small>
            {briefing.sections.map((s) => (
              <section key={s.title}>
                <h4>{s.title}</h4>
                {!s.available ? (
                  <p>{s.note}</p>
                ) : (
                  <>
                    {s.items.length ? (
                      s.items.map((i) => (
                        <a key={i.id} href={i.href}>
                          {i.title}
                          {i.date
                            ? ` · ${new Date(i.date).toLocaleString()}`
                            : ""}
                          {i.overdue ? " · Overdue" : ""}
                        </a>
                      ))
                    ) : (
                      <small>No matching recorded items.</small>
                    )}
                    <p>
                      <small>
                        {s.note}
                        {s.limited
                          ? " Showing a limited sample; open the workspace for all records."
                          : ""}
                      </small>
                    </p>
                  </>
                )}
              </section>
            ))}
            {briefing.limitations.map((l) => (
              <p key={l}>
                <small>{l}</small>
              </p>
            ))}
          </section>
        )}
        {messages.map((m) => (
          <article key={m.id} className={`assistant-message ${m.role}`}>
            <small>{m.role === "user" ? "YOU" : "MYARI"}</small>
            <p>{m.content}</p>
            {m.result?.sources?.map((s, i) => (
              <a
                className="assistant-source"
                key={`${s.id}-${i}`}
                href={s.href}
              >
                {s.label}
              </a>
            ))}
          </article>
        ))}
        {proposals.map((p) => (
          <article key={p.id} className="assistant-proposal">
            <small>
              {p.status === "saved"
                ? "SAVED TO CRM"
                : p.status === "approved"
                  ? "APPROVED DRAFT · NOT EXECUTED"
                  : p.status === "dismissed"
                    ? "DISMISSED"
                    : "PROPOSED · APPROVAL REQUIRED"}
            </small>
            <h3>{p.payload.title}</h3>
            {p.payload.subject && (
              <label>
                Subject
                <input
                  aria-label={`${p.payload.title} subject`}
                  value={(edits[p.id] ?? p.payload).subject ?? ""}
                  readOnly={p.status !== "proposed"}
                  maxLength={200}
                  onChange={(e) => {
                    setConfirm(undefined);
                    setEdits((prev) => ({
                      ...prev,
                      [p.id]: {
                        ...(prev[p.id] ?? p.payload),
                        subject: e.target.value,
                      },
                    }));
                  }}
                />
              </label>
            )}
            <textarea
              aria-label={`${p.payload.title} draft`}
              value={(edits[p.id] ?? p.payload).body}
              readOnly={p.status !== "proposed"}
              maxLength={
                p.payload.kind === "sms_draft"
                  ? 320
                  : ["task", "reminder"].includes(p.payload.kind)
                    ? 2000
                    : 5000
              }
              onChange={(e) => {
                setConfirm(undefined);
                setEdits((prev) => ({
                  ...prev,
                  [p.id]: {
                    ...(prev[p.id] ?? p.payload),
                    body: e.target.value,
                  },
                }));
              }}
              rows={5}
            />
            {p.payload.dueAt && (
              <p>
                <small>{new Date(p.payload.dueAt).toLocaleString()}</small>
              </p>
            )}
            <footer>
              <button
                onClick={() =>
                  void navigator.clipboard
                    .writeText(
                      [
                        (edits[p.id] ?? p.payload).subject
                          ? `Subject: ${(edits[p.id] ?? p.payload).subject}`
                          : "",
                        (edits[p.id] ?? p.payload).body,
                      ]
                        .filter(Boolean)
                        .join("\n\n"),
                    )
                    .catch(() =>
                      setError(
                        "Copy unavailable. Select the draft text to copy it.",
                      ),
                    )
                }
              >
                Copy draft
              </button>
              {p.status === "proposed" && (
                <>
                  <button
                    disabled={busy || Boolean(edits[p.id])}
                    onClick={() => setConfirm(p.id)}
                  >
                    Review approval
                  </button>
                  {edits[p.id] && (
                    <button disabled={busy} onClick={() => void revise(p)}>
                      Save draft edits
                    </button>
                  )}
                  <button disabled={busy} onClick={() => void decide(p, false)}>
                    Dismiss
                  </button>
                </>
              )}
              {p.status !== "dismissed" && (
                <a className="assistant-source" href={HANDOFFS[p.payload.kind]}>
                  Open workspace to edit
                </a>
              )}
            </footer>
            {confirm === p.id && p.status === "proposed" && (
              <div>
                <p>
                  {["task", "reminder", "contact_note"].includes(p.payload.kind)
                    ? "Save this exact proposal to your CRM? No message will be sent and no calendar sync will run."
                    : "Save this as an approved review draft? Complete it separately in its workspace. No message, campaign, appointment or financial report will be executed."}
                </p>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() => void decide(p, true)}
                >
                  Confirm{" "}
                  {p.payload.kind === "task" ||
                  p.payload.kind === "reminder" ||
                  p.payload.kind === "contact_note"
                    ? "save"
                    : "draft approval"}
                </button>{" "}
                <button onClick={() => setConfirm(undefined)}>Cancel</button>
              </div>
            )}
          </article>
        ))}
        {busy && (
          <p role="status" aria-live="polite">
            Working with your authorized CRM records…
          </p>
        )}
        {error && (
          <p className="assistant-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <form
        className="assistant-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="assistant-message">
          <small>What would you like to work on?</small>
        </label>
        <textarea
          id="assistant-message"
          rows={3}
          maxLength={3000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about a contact, plan a follow-up, or prepare a draft…"
        />
        <footer>
          <small>Drafts are suggestions until you approve.</small>
          <button
            className="primary"
            type="submit"
            disabled={busy || !text.trim() || !owner}
          >
            Ask MyARI →
          </button>
        </footer>
      </form>
    </aside>,
    document.body,
  );
}
