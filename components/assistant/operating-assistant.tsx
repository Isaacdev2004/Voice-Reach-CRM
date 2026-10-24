"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/crm/modal";
import { useAiAssistant } from "@/components/ai/ai-assistant-context";
import { selectedPageRecord } from "@/lib/assistant/page-record";
import { pageContext } from "@/lib/assistant/context";
import type { Proposal } from "@/lib/assistant/schema";
import { ActionPreview } from "./preview";
import { AssistantDictation } from "./dictation";
type Message = { role: string; content: string; proposalIds?: string[] };
const suggestions: Record<string, string[]> = {
  contacts: [
    "Summarize this lead.",
    "Prepare a follow-up task.",
    "Draft a text for this client.",
  ],
  campaigns: [
    "Create a 21-day cold buyer campaign.",
    "Review this campaign.",
    "Prepare a Sapphire voicemail script.",
  ],
  calendar: ["What is on my calendar today?", "Prepare a buyer consultation."],
  tasks: ["Show overdue follow-ups.", "Prepare a reminder for this client."],
  notes: [
    "Summarize my latest notes.",
    "Turn these notes into task proposals.",
  ],
  properties: [
    "Review this buyer’s saved preferences.",
    "Prepare a flyer for this saved property.",
  ],
  mortgage: ["Prepare a mortgage comparison.", "Prepare a seller net sheet."],
  "voice-scripts": ["Rewrite my voicemail as a draft."],
  activity: ["Show replies needing attention."],
  settings: ["Review my approved Brand Kit."],
  dashboard: ["What should I focus on today?"],
};
export function OperatingAssistant({
  owner,
  onLegacy,
}: {
  owner: string;
  onLegacy: () => void;
}) {
  const { state, closeAssistant } = useAiAssistant(),
    pathname = usePathname();
  const [dictationBusy, setDictationBusy] = useState(false);
  const [expanded, setExpanded] = useState(false),
    [conversation, setConversation] = useState(""),
    [command, setCommand] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [proposals, setProposals] = useState<Proposal[]>([]),
    [results, setResults] = useState<{ name: string; data: unknown }[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recents, setRecents] = useState<
      { conversationId: string; message: string; at: string }[]
    >([]),
    [provider, setProvider] = useState(""),
    [usage, setUsage] = useState("");
  const controller = useRef<AbortController | null>(null),
    active = useRef(true);
  useEffect(() => {
    active.current = true;
    setConversation(crypto.randomUUID());
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (state.open && state.brief && !command) setCommand(state.brief);
  }, [state.open, state.brief, command]);
  const history = useCallback(async () => {
    try {
      const r = await fetch("/api/assistant/history", {
          headers: { "X-MyARI-Owner": owner },
        }),
        d = await r.json();
      if (r.ok && active.current) setRecents(d.recent ?? []);
    } catch {
      /* Current unsaved command remains in state. */
    }
  }, [owner]);
  useEffect(() => {
    if (state.open) void history();
  }, [state.open, history]);
  async function resume(id: string) {
    if (busy) return;
    setError("");
    try {
      const r = await fetch(`/api/assistant/history?conversationId=${id}`, {
          headers: { "X-MyARI-Owner": owner },
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setConversation(id);
      setMessages(d.messages ?? []);
      setProposals([]);
      setResults([]);
      const ids = [
        ...new Set<string>(
          (d.messages ?? []).flatMap((m: Message) => m.proposalIds ?? []),
        ),
      ].slice(-10);
      const loaded = await Promise.all(
        ids.map(async (pid) => {
          const response = await fetch(`/api/assistant/proposals?id=${pid}`, {
            headers: { "X-MyARI-Owner": owner },
          });
          const data = await response.json();
          return response.ok && !data.outcome ? data.proposal : null;
        }),
      );
      if (active.current) setProposals(loaded.filter(Boolean));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversation unavailable");
    }
  }
  async function run() {
    if (!command.trim() || !conversation || busy) return;
    controller.current?.abort();
    controller.current = new AbortController();
    setBusy(true);
    setError("");
    const text = command;
    setCommand("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    try {
      const context = pageContext(pathname, window.location.search, {
        ...selectedPageRecord(owner, pathname),
        ...Object.fromEntries(
          Object.entries(state.context).filter(([, v]) => v != null),
        ),
      });
      const r = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-MyARI-Owner": owner },
        signal: controller.current.signal,
        body: JSON.stringify({
          conversationId: conversation,
          requestId: crypto.randomUUID(),
          message: text,
          context,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error ?? "Assistant could not respond");
      if (!active.current) return;
      setMessages((m) => [...m, { role: "assistant", content: d.message }]);
      setProposals((p) => [...p, ...d.proposals]);
      setResults(d.results ?? []);
      setProvider(d.usage?.provider ?? "");
      setUsage(
        `${d.usage?.inputTokens ?? 0} input / ${d.usage?.outputTokens ?? 0} output tokens`,
      );
      await history();
    } catch (e) {
      if (active.current) {
        setCommand((current) => current || text);
        setError(
          e instanceof Error
            ? e.message
            : "Assistant unavailable. Your command is preserved.",
        );
      }
    } finally {
      if (active.current) setBusy(false);
    }
  }
  async function remove() {
    if (
      busy ||
      !window.confirm(
        "Delete this conversation’s messages? CRM records and execution audit history remain.",
      )
    )
      return;
    try {
      const r = await fetch("/api/assistant/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-MyARI-Owner": owner },
        body: JSON.stringify({
          conversationId: conversation,
          confirmation: "DELETE_CONVERSATION",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setConversation(crypto.randomUUID());
      setMessages([]);
      setProposals([]);
      setResults([]);
      await history();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion unavailable");
    }
  }
  const section = pathname.split("/")[2] || "dashboard";
  return (
    <Modal
      open={state.open}
      nonModal={!expanded}
      onClose={() => {
        if (dictationBusy) {
          setError(
            "Stop recording or wait for the editable transcript before closing.",
          );
          return;
        }
        closeAssistant();
      }}
      title="MyARI Assistant"
      description="Verified context. Thoughtful drafts. Your approval."
      size="xl"
      className={`assistant-drawer ${expanded ? "assistant-expanded" : ""}`}
    >
      <div className="assistant-toolbar">
        <button onClick={() => setExpanded(!expanded)}>
          {expanded ? "Compact drawer" : "Expand workspace"}
        </button>
        <a href="/dashboard/assistant">Command Center</a>
        <button onClick={onLegacy}>Claude draft tools</button>
      </div>
      <p className="assistant-context">
        Workspace: {section.replaceAll("-", " ")}
        {state.context.contactId ? " · Selected contact" : ""}.
      </p>
      <details>
        <summary>Conversations &amp; recovery</summary>
        <button
          disabled={busy}
          onClick={() => {
            setConversation(crypto.randomUUID());
            setMessages([]);
            setProposals([]);
            setResults([]);
            setError("");
          }}
        >
          New conversation
        </button>
        <button
          disabled={busy || !messages.length}
          onClick={() => void remove()}
        >
          Delete conversation
        </button>
        {Array.from(
          new Map(recents.map((r) => [r.conversationId, r])).values(),
        ).map((r) => (
          <button
            key={r.conversationId}
            disabled={busy}
            onClick={() => void resume(r.conversationId)}
          >
            {r.message.slice(0, 80)}
          </button>
        ))}
      </details>
      <div className="assistant-suggestions">
        {(suggestions[section] ?? suggestions.dashboard).map((s) => (
          <button key={s} onClick={() => setCommand(s)}>
            {s}
          </button>
        ))}
      </div>
      <div className="assistant-messages" aria-live="polite">
        {messages.map((m, i) => (
          <article
            key={i}
            className={`assistant-message ${m.role === "user" ? "assistant-user" : ""}`}
          >
            <strong>{m.role === "user" ? "You" : "MyARI"}</strong>
            <p>{m.content}</p>
          </article>
        ))}
      </div>
      {results.length > 0 && (
        <details>
          <summary>Verified tool results &amp; source records</summary>
          {results.map((r, i) => (
            <article key={i}>
              <strong>{r.name.replaceAll("_", " ")}</strong>
              <pre>{JSON.stringify(r.data, null, 2)}</pre>
            </article>
          ))}
        </details>
      )}
      {proposals.map((p) => (
        <ActionPreview
          key={p.id}
          proposal={p}
          owner={owner}
          onUpdated={() => void history()}
        />
      ))}
      {error && <p role="alert">{error}</p>}
      {busy && (
        <p role="status">
          Retrieving authorized context and preparing a response… Closing
          preserves this work.
        </p>
      )}
      <label className="assistant-command-label">
        What would you like to move forward?
        <textarea
          aria-label="Assistant command"
          value={command}
          maxLength={6000}
          onChange={(e) => setCommand(e.target.value)}
          rows={3}
          placeholder="Describe a task, client follow-up or campaign…"
        />
      </label>
      <div className="assistant-actions">
        <button
          className="assistant-primary"
          disabled={busy || !command.trim() || !conversation}
          onClick={() => void run()}
        >
          Prepare response
        </button>
        <a href="/dashboard/settings?tab=brand">
          Assistant &amp; Brand Kit preferences
        </a>
      </div>
      <details>
        <summary>Voice command</summary>
        <AssistantDictation
          owner={owner}
          onProcessing={setDictationBusy}
          onTranscript={(text) =>
            setCommand((current) => (current ? current + "\n" + text : text))
          }
        />
      </details>
      <p className="assistant-safety">
        Prepared only. Chat and voice commands never approve actions. Review
        each exact preview before saving.{" "}
        {provider && `${provider} · ${usage}.`} No automatic provider switch.
        Service safeguards apply: 5 requests per minute; default 30 interactions
        and 40 provider calls per UTC day. Failed requests do not consume
        monthly delivered-result allowances.
      </p>
    </Modal>
  );
}
