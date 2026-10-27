"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  lazy,
  Suspense,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
const RecentWork = lazy(() =>
  import("./command-center").then((module) => ({
    default: module.CommandCenter,
  })),
);
import { WorkspaceIcon } from "./workspace-icon";
import { SourceResults } from "./source-results";
import {
  workspaceActions,
  conversationId,
  conversationPointerKey,
  recentConversations,
  type WorkspaceMode,
} from "@/lib/assistant/workspace-ui";
import { useAiAssistant } from "@/components/ai/ai-assistant-context";
import { selectedPageRecord } from "@/lib/assistant/page-record";
import { pageContext } from "@/lib/assistant/context";
import type { Proposal } from "@/lib/assistant/schema";
import { ActionPreview } from "./preview";
import { AssistantDictation } from "./dictation";
type Message = { role: string; content: string; proposalIds?: string[] };
export function OperatingAssistant({
  owner,
  firstName,
  onLegacy,
  legacyOpen = false,
  onReturn,
  legacyContent,
}: {
  owner: string;
  firstName?: string;
  onLegacy: () => void;
  legacyOpen?: boolean;
  onReturn?: () => void;
  legacyContent?: ReactNode;
}) {
  const { state, closeAssistant, openAssistant } = useAiAssistant(),
    pathname = usePathname(),
    router = useRouter();
  const fullRoute = pathname === "/dashboard/assistant";
  const [mode, setMode] = useState<WorkspaceMode>(
      fullRoute ? "workspace" : "drawer",
    ),
    [historyQuery, setHistoryQuery] = useState(""),
    [showHistory, setShowHistory] = useState(false),
    [showPreview, setShowPreview] = useState(true),
    [showWork, setShowWork] = useState(false);
  const previousPage = useRef("/dashboard");
  const [limits, setLimits] = useState<{
    dailyInteractions: number;
    dailyProviderCalls: number;
  } | null>(null);
  const messageBox = useRef<HTMLDivElement>(null),
    followNewest = useRef(true),
    panel = useRef<HTMLElement>(null);
  const pointerKey = conversationPointerKey(owner);
  const [dictationBusy, setDictationBusy] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);
  const [conversation, setConversation] = useState(""),
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
    let saved: string | null = null;
    try {
      saved = conversationId(localStorage.getItem(pointerKey));
    } catch {
      /* Browser storage is optional. */
    }
    if (saved) void resume(saved);
    else setConversation(crypto.randomUUID());
    void fetch("/api/assistant/config", { headers: { "X-MyARI-Owner": owner } })
      .then((r) => r.json())
      .then((d) => {
        if (active.current && d.enabled) setLimits(d.safetyLimits);
      })
      .catch(() => undefined);
    return () => {
      active.current = false;
      controller.current?.abort();
    };
    // Owner changes remount this component; only an opaque pointer is stored locally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);
  const lastBrief = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (state.open && state.brief && lastBrief.current !== state.brief) {
      lastBrief.current = state.brief;
      setCommand((current) => current || state.brief || "");
    }
  }, [state.open, state.brief]);
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
    if (state.open || fullRoute) void history();
  }, [state.open, fullRoute, history]);
  useEffect(() => {
    if (fullRoute) setMode("workspace");
    else {
      previousPage.current = pathname;
      setMode(state.mode === "overlay" ? "overlay" : "drawer");
    }
  }, [fullRoute, pathname, state.mode]);
  useEffect(() => {
    if (conversation) {
      try {
        localStorage.setItem(pointerKey, conversation);
      } catch {
        /* Optional preference only. */
      }
    }
  }, [conversation, pointerKey]);
  useEffect(() => {
    const refresh = () => {
      if ((state.open || fullRoute) && !busy) void history();
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [state.open, fullRoute, busy, history]);
  useEffect(() => {
    if (messageBox.current && !messages.length)
      messageBox.current.scrollTop = 0;
    else if (followNewest.current && messageBox.current)
      messageBox.current.scrollTop = messageBox.current.scrollHeight;
  }, [messages, busy]);
  const visible = fullRoute || state.open || dictationBusy;
  useEffect(() => {
    if (!visible) return;
    const prior = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mode !== "workspace" && !dictationBusy)
        closeAssistant();
      if (event.key !== "Tab" || mode !== "overlay") return;
      const nodes = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),a[href],input,textarea,select,summary",
        ) ?? [],
      ).filter((e) => e.getClientRects().length && !e.closest("[hidden]"));
      const first = nodes[0],
        last = nodes.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const overflow = document.body.style.overflow;
    if (mode === "overlay") document.body.style.overflow = "hidden";
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("keydown", escape);
      if (mode === "overlay") document.body.style.overflow = overflow;
      if (prior?.isConnected) prior.focus();
    };
  }, [visible, mode, dictationBusy, closeAssistant]);
  function changeMode(next: WorkspaceMode) {
    if (dictationBusy) {
      setError("Stop recording before switching display modes.");
      return;
    }
    setMode(next);
    openAssistant({ mode: next });
    if (next === "workspace" && !fullRoute) router.push("/dashboard/assistant");
    else if (next !== "workspace" && fullRoute)
      router.push(previousPage.current);
  }
  function newConversation() {
    if (busy || dictationBusy) return;
    if (
      command.trim() &&
      !window.confirm(
        "Start a new conversation? Your unsent text will stay in the composer.",
      )
    )
      return;
    setConversation(crypto.randomUUID());
    setNeedsRecovery(false);
    setMessages([]);
    setProposals([]);
    setResults([]);
    setError("");
  }
  const resumeSequence = useRef(0);
  async function resume(id: string) {
    const sequence = ++resumeSequence.current;
    if (busy || dictationBusy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/assistant/history?conversationId=${id}`, {
          headers: { "X-MyARI-Owner": owner },
        }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (!active.current || sequence !== resumeSequence.current) return;
      setConversation(id);
      setMessages(d.messages ?? []);
      setNeedsRecovery(false);
      setShowHistory(false);
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
      if (active.current && sequence === resumeSequence.current)
        setProposals(loaded.filter(Boolean));
    } catch (e) {
      if (active.current && sequence === resumeSequence.current) {
        setConversation(id);
        setError(e instanceof Error ? e.message : "Conversation unavailable");
      }
    } finally {
      if (active.current && sequence === resumeSequence.current) setBusy(false);
    }
  }
  async function run() {
    if (
      !command.trim() ||
      !conversation ||
      busy ||
      dictationBusy ||
      needsRecovery
    )
      return;
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
      setProposals((p) => [...p, ...(d.proposals ?? [])]);
      if (d.proposals?.length) setShowPreview(true);
      setResults(d.results ?? []);
      setProvider(d.usage?.provider ?? "");
      setUsage(
        `${d.usage?.inputTokens ?? 0} input / ${d.usage?.outputTokens ?? 0} output tokens`,
      );
      await history();
    } catch (e) {
      if (active.current) {
        setNeedsRecovery(true);
        setCommand((current) => current || text);
        setError(
          controller.current?.signal.aborted
            ? "Response stopped locally. The server may still finish. Reload this conversation before retrying to avoid duplicates."
            : e instanceof Error
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
  const conversations = recentConversations(recents).filter((r) =>
    r.message.toLowerCase().includes(historyQuery.toLowerCase()),
  );
  function cancelResponse() {
    controller.current?.abort();
    setError(
      "Response stopped locally. The server may still finish. Reload this conversation before retrying to avoid duplicates.",
    );
  }

  return (
    <div className={`aw-host aw-${mode}`} hidden={!visible}>
      {mode === "overlay" && (
        <button
          className="aw-backdrop"
          aria-label="Close expanded Assistant"
          onClick={() => {
            if (!dictationBusy) closeAssistant();
          }}
        />
      )}
      <section
        ref={panel}
        tabIndex={-1}
        role={mode === "workspace" ? "region" : "dialog"}
        aria-modal={mode === "overlay" ? true : undefined}
        aria-label="MyARI Assistant"
        className="aw-panel"
      >
        <header className="aw-topbar">
          <div>
            <span className="aw-emblem" aria-hidden="true">
              ✧
            </span>
            <strong>MyARI Assistant</strong>
            <small>
              {provider
                ? `${provider} · Connected conversation`
                : "Your real estate relationship copilot"}
            </small>
          </div>
          <nav aria-label="Assistant display mode">
            {(
              [
                ["workspace", "Full Workspace"],
                ["drawer", "Compact Drawer"],
                ["overlay", "Expanded Overlay"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={mode === value}
                onClick={() => changeMode(value)}
              >
                {label}
              </button>
            ))}
          </nav>
          {mode !== "workspace" && (
            <button
              aria-label="Close Assistant"
              onClick={() => {
                if (dictationBusy) {
                  setError("Stop recording before closing.");
                  return;
                }
                closeAssistant();
              }}
            >
              ×
            </button>
          )}
        </header>
        <div className="aw-toolbar">
          <button
            onClick={() => setShowHistory(!showHistory)}
            aria-expanded={showHistory}
          >
            History
          </button>
          <button
            onClick={() => {
              if (!dictationBusy) onLegacy();
            }}
          >
            Claude draft tools
          </button>
          <Link href="/dashboard/concierge">MyARI Concierge →</Link>
          <button
            onClick={() => setShowWork(!showWork)}
            aria-expanded={showWork}
          >
            Saved work
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            aria-expanded={showPreview}
          >
            Action workspace
          </button>
          {legacyOpen && (
            <button onClick={onReturn}>← Return to Assistant</button>
          )}
        </div>
        <div hidden={!legacyOpen} className="aw-legacy">
          {legacyContent}
        </div>
        <div hidden={legacyOpen} className="aw-layout">
          <aside
            className={`aw-history ${showHistory ? "aw-open" : ""}`}
            aria-label="Conversation history"
          >
            <button
              className="assistant-primary"
              disabled={busy || dictationBusy}
              onClick={newConversation}
            >
              ＋ New conversation
            </button>
            <label>
              Search history
              <input
                value={historyQuery}
                onChange={(e) => setHistoryQuery(e.target.value)}
                placeholder="Find previous work…"
              />
            </label>
            <h2>Recent conversations</h2>
            {!conversations.length && <p>No matching conversations yet.</p>}
            {conversations.map((r) => (
              <button
                className="aw-history-item"
                aria-current={
                  conversation === r.conversationId ? "true" : undefined
                }
                key={r.conversationId}
                disabled={busy || dictationBusy}
                onClick={() => {
                  if (
                    command.trim() &&
                    !window.confirm(
                      "Switch conversation? Your unsent text stays in the composer.",
                    )
                  )
                    return;
                  void resume(r.conversationId);
                }}
              >
                <span>{r.message.slice(0, 75)}</span>
                <small>{new Date(r.at).toLocaleDateString()}</small>
              </button>
            ))}
            <button onClick={() => void history()}>Refresh history</button>
            <div className="aw-shortcuts">
              <h2>Your workspace</h2>
              <Link href="/dashboard/campaigns">Campaign drafts →</Link>
              <Link href="/dashboard/voice-scripts">Voice Studio →</Link>
              <Link href="/dashboard/concierge">Onboarding & setup →</Link>
              <Link href="/dashboard/settings?tab=brand">
                Brand & review preferences →
              </Link>
            </div>
            <p className="aw-note">
              History follows your account’s retention settings. Only an opaque
              conversation pointer is stored in this browser.
            </p>
          </aside>
          <div className="aw-center">
            <div
              className="aw-scroll"
              ref={messageBox}
              onScroll={(e) => {
                const el = e.currentTarget;
                followNewest.current =
                  el.scrollHeight - el.scrollTop - el.clientHeight < 120;
              }}
            >
              {!messages.length && (
                <>
                  <div className="aw-hero">
                    <Image
                      src="/brand/heroes/dashboard-interior.jpg"
                      alt=""
                      fill
                      sizes="(max-width: 700px) 100vw, 800px"
                      priority
                    />
                    <div>
                      <p>ASK. CREATE. ORGANIZE. GROW.</p>
                      <h1>
                        Turn ideas
                        <br />
                        <em>into action.</em>
                      </h1>
                      <p>Ask, plan, create, and get results with MyARI.</p>
                    </div>
                  </div>
                  <div className="aw-welcome">
                    <h2>
                      {firstName
                        ? `Hi ${firstName}. What would you like to move forward?`
                        : "What would you like to move forward?"}
                    </h2>
                    <p>
                      Thoughtful plans. Verified CRM context. Every action yours
                      to approve.
                    </p>
                  </div>
                  <div className="aw-quick-actions">
                    {workspaceActions.map((a) => (
                      <button
                        key={a.id}
                        disabled={busy}
                        onClick={() => {
                          setCommand(a.prompt);
                          panel.current
                            ?.querySelector<HTMLTextAreaElement>(
                              '[aria-label="Assistant command"]',
                            )
                            ?.focus();
                        }}
                      >
                        <span>
                          <WorkspaceIcon name={a.id} />
                        </span>
                        <strong>{a.title}</strong>
                        <small>{a.detail}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <div
                className="aw-messages"
                aria-live="polite"
                aria-relevant="additions text"
              >
                {messages.map((message, index) => (
                  <article
                    key={index}
                    className={`aw-message aw-${message.role}`}
                  >
                    <strong>{message.role === "user" ? "You" : "MyARI"}</strong>
                    <p>{message.content}</p>
                  </article>
                ))}
              </div>
              {results.length > 0 && <SourceResults results={results} />}
              {busy && (
                <p role="status" className="aw-loading">
                  Retrieving authorized context and preparing a response…
                </p>
              )}
              {error && (
                <div role="alert" className="aw-error">
                  <p>{error}</p>
                  <button
                    disabled={busy}
                    onClick={() => void resume(conversation)}
                  >
                    Reload conversation safely
                  </button>
                </div>
              )}
              {showWork && (
                <div className="aw-work">
                  <Suspense
                    fallback={<p role="status">Loading authorized work…</p>}
                  >
                    <RecentWork embedded />
                  </Suspense>
                </div>
              )}
            </div>
            <div className="aw-composer">
              <label htmlFor="aw-command">Ask MyARI anything</label>
              <textarea
                id="aw-command"
                aria-label="Assistant command"
                value={command}
                maxLength={6000}
                rows={3}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Plan a follow-up, find a contact, or create a campaign…"
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    void run();
                  }
                }}
              />
              <div className="aw-composer-actions">
                <span className="aw-context">
                  {section === "assistant"
                    ? "Authorized CRM workspace"
                    : `Context: ${section}`}
                </span>
                <button
                  disabled={busy}
                  onClick={() =>
                    setCommand(
                      workspaceActions.find((a) => a.id === "search")!.prompt,
                    )
                  }
                >
                  ⌕ CRM search
                </button>
                <details>
                  <summary>Voice</summary>
                  <AssistantDictation
                    owner={owner}
                    onProcessing={setDictationBusy}
                    onTranscript={(text) =>
                      setCommand((current) =>
                        current ? current + "\n" + text : text,
                      )
                    }
                  />
                </details>
                {busy ? (
                  <button onClick={cancelResponse}>Stop response</button>
                ) : (
                  <button
                    className="assistant-primary"
                    disabled={
                      !command.trim() ||
                      !conversation ||
                      dictationBusy ||
                      needsRecovery
                    }
                    onClick={() => void run()}
                  >
                    Prepare response →
                  </button>
                )}
              </div>
              <p className="aw-note">
                Drafts only until approved. No automatic enrollment, sending or
                billing changes.{" "}
                {limits
                  ? `${limits.dailyInteractions} interactions / ${limits.dailyProviderCalls} provider calls per UTC day.`
                  : "Account usage limits apply."}{" "}
                {usage}
              </p>
            </div>
          </div>
          <aside
            hidden={!showPreview}
            className="aw-action-panel"
            aria-label="Action workspace"
          >
            <h2>Action workspace</h2>
            <p>Review the exact changes before deciding what to save.</p>
            {!proposals.length && (
              <div className="aw-empty">
                <span aria-hidden="true">✧</span>
                <h3>A little clarity, before action.</h3>
                <p>
                  Your campaign sequences, messages and proposed tasks appear
                  here.
                </p>
                <p>
                  Existing saved campaigns are edited in the campaign builder.
                  AI revises unsaved proposals only.
                </p>
                <Link href="/dashboard/campaigns">Open campaign drafts →</Link>
              </div>
            )}
            {proposals.map((proposal) => (
              <ActionPreview
                key={proposal.id}
                proposal={proposal}
                owner={owner}
                onUpdated={() => void history()}
                allowSending={false}
              />
            ))}
            <button
              disabled={busy || !messages.length || dictationBusy}
              onClick={() => void remove()}
            >
              Delete conversation messages
            </button>
            <p className="aw-note">
              CRM records and execution audit history are retained.
            </p>
          </aside>
        </div>
      </section>
    </div>
  );
}
