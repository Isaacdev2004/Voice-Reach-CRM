"use client";
import {
  useCallback,
  useMemo,
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
import { useOwnerLibraryPreferences } from "@/lib/hooks/use-owner-library-preferences";
import { Confirmation, type AssistantConfirmation } from "./confirmation";
import { CapabilityDetails } from "./capability-details";
import { WorkspaceIcon } from "./workspace-icon";
import { SourceResults } from "./source-results";
import {
  workspaceActions,
  capabilityInformation,
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
      fullRoute ? "workspace" : "overlay",
    ),
    [historyQuery, setHistoryQuery] = useState(""),
    [showHistory, setShowHistory] = useState(false),
    [showPreview, setShowPreview] = useState(false),
    [confirmation, setConfirmation] = useState<AssistantConfirmation | null>(null),
    [showWork, setShowWork] = useState(false),
    [conciergeEnabled, setConciergeEnabled] = useState<boolean | null>(null),
    [restoring, setRestoring] = useState(true),
    [greeting, setGreeting] = useState("Hello");
  const organization = useOwnerLibraryPreferences(owner, "assistant");
  const [historyMenu, setHistoryMenu] = useState<string | null>(null);
  const [learnAbout, setLearnAbout] = useState<(typeof workspaceActions)[number] | null>(null);
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
    const hour = new Date().getHours();
    setGreeting(
      hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening",
    );
    if (saved)
      void resume(saved).finally(() => {
        if (active.current) setRestoring(false);
      });
    else {
      setConversation(crypto.randomUUID());
      setRestoring(false);
    }
    void fetch("/api/concierge/access")
      .then(async (r) => {
        const d = await r.json();
        if (active.current) setConciergeEnabled(r.ok && d.enabled === true);
      })
      .catch(() => {
        if (active.current) setConciergeEnabled(false);
      });
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
  const priorPath = useRef(pathname);
  useEffect(() => {
    const leftWorkspace =
      priorPath.current === "/dashboard/assistant" && !fullRoute;
    priorPath.current = pathname;
    if (fullRoute) setMode("workspace");
    else {
      previousPage.current = pathname;
      if (leftWorkspace && state.mode !== "overlay") {
        closeAssistant();
        setMode("workspace");
      } else if (state.open && state.mode !== "overlay") {
        setMode("workspace");
        router.push("/dashboard/assistant");
      } else setMode(state.mode === "overlay" ? "overlay" : "workspace");
    }
  }, [fullRoute, pathname, state.open, state.mode, closeAssistant, router]);
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
    else if (followNewest.current && messageBox.current) {
      const el = messageBox.current;
      const reply = el.querySelector<HTMLElement>(
        ".aw-message.aw-assistant:last-child",
      );
      el.scrollTop =
        messages.length <= 2
          ? 0
          : proposals.length && messages.at(-1)?.role === "assistant" && reply
            ? Math.max(0, reply.offsetTop - 14)
            : el.scrollHeight;
    }
  }, [messages, busy, proposals.length]);
  const visible = fullRoute || state.open || dictationBusy;
  useEffect(() => {
    if (!visible) return;
    const prior = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape" && !dictationBusy) {
        const menu =
          panel.current?.querySelector<HTMLDetailsElement>(".aw-more[open]");
        if (menu) {
          menu.open = false;
          menu.querySelector<HTMLElement>("summary")?.focus();
          return;
        }
        if (showHistory || showPreview) {
          setShowHistory(false);
          setShowPreview(false);
          panel.current?.focus();
        } else if (mode !== "workspace") closeAssistant();
      }
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
  }, [visible, mode, dictationBusy, closeAssistant, showHistory, showPreview]);
  function changeMode(next: WorkspaceMode) {
    if (dictationBusy) {
      setError("Stop recording before switching display modes.");
      return;
    }
    setMode(next);
    openAssistant({ mode: next });
    if (next !== "workspace" && fullRoute) router.push(previousPage.current);
  }
  function newConversation() {
    if (busy || dictationBusy) return;
    if (command.trim() || proposals.length > 0) {
      setConfirmation({ message: "Start a new conversation? Your unsent text stays in the composer. Unsubmitted proposal edits will be discarded; saved history remains available.", accept: startNewConversation });
      return;
    }
    startNewConversation();
  }
  function startNewConversation() {
    if (legacyOpen) onReturn?.();
    setConversation(crypto.randomUUID());
    setRestoring(false);
    setNeedsRecovery(false);
    setMessages([]);
    setProposals([]);
    setResults([]);
    setShowPreview(false);
    setShowHistory(false);
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
      setShowPreview(false);
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
      if (active.current && sequence === resumeSequence.current) {
        setProposals(loaded.filter(Boolean));
        setShowPreview(loaded.some(Boolean));
      }
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
    followNewest.current = true;
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
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: d.message,
          proposalIds: (d.proposals ?? []).map((p: Proposal) => p.id),
        },
      ]);
      setProposals((p) => [...p, ...(d.proposals ?? [])]);
      if (d.proposals?.length) {
        setShowHistory(false);
        setShowPreview(true);
      }
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
  function remove(id = conversation) {
    if (busy || dictationBusy) return;
    setConfirmation({ message: "Delete this conversation’s messages? CRM records and execution audit history remain.", accept: () => void removeConfirmed(id) });
  }
  async function removeConfirmed(id: string) {
    if (busy || dictationBusy) return;
    setBusy(true);
    try {
      const r = await fetch("/api/assistant/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-MyARI-Owner": owner },
        body: JSON.stringify({
          conversationId: id,
          confirmation: "DELETE_CONVERSATION",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (id === conversation) {
        setConversation(crypto.randomUUID());
        setMessages([]);
        setProposals([]);
        setResults([]);
      }
      organization.update({ pins: organization.pins.filter((pin) => pin !== id), categories: [] });
      setHistoryMenu(null);
      await history();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion unavailable");
    } finally { setBusy(false); }
  }
  function choosePrompt(prompt: string) {
    if (legacyOpen) onReturn?.();
    setCommand(prompt);
    panel.current
      ?.querySelector<HTMLTextAreaElement>('[aria-label="Assistant command"]')
      ?.focus();
  }
  function openConcierge() {
    if (dictationBusy) {
      setError("Stop recording before opening Concierge.");
      return;
    }
    if (legacyOpen) onReturn?.();
    if (conciergeEnabled !== true) {
      setError(
        "Concierge is not enabled for this account in this environment. Your Assistant work is preserved.",
      );
      return;
    }
    closeAssistant();
    router.push("/dashboard/concierge");
  }
  function returnToCrm() {
    if (dictationBusy) {
      setError("Stop recording before leaving.");
      return;
    }
    closeAssistant();
    router.push(previousPage.current);
  }
  const section = pathname.split("/")[2] || "dashboard";
  const conversations = recentConversations(recents).filter((r) =>
    r.message.toLowerCase().includes(historyQuery.toLowerCase()),
  ).sort((a, b) => Number(organization.pins.includes(b.conversationId)) - Number(organization.pins.includes(a.conversationId)));
  function cancelResponse() {
    controller.current?.abort();
    setError(
      "Response stopped locally. The server may still finish. Reload this conversation before retrying to avoid duplicates.",
    );
  }

  const proposalGroups = useMemo(() => {
    const firstMessage = new Map<string, number>();
    messages.forEach((message, index) => message.proposalIds?.forEach(id => { if (!firstMessage.has(id)) firstMessage.set(id, index); }));
    const byMessage = new Map<number, Proposal[]>(), unassigned: Proposal[] = [];
    for (const proposal of proposals) {
      const index = firstMessage.get(proposal.id);
      if (index === undefined) unassigned.push(proposal);
      else { const group = byMessage.get(index) ?? []; group.push(proposal); byMessage.set(index, group); }
    }
    return { byMessage, unassigned };
  }, [messages, proposals]);
  function renderProposals(group: Proposal[]) {
    if (!group.length) return null;
    return (
      <section
        hidden={!showPreview || !group.length}
        className="aw-action-panel aw-inline-proposals"
        aria-label="Proposed work"
      >
        <button
          className="aw-panel-close"
          onClick={() => setShowPreview(false)}
          aria-label="Close action workspace"
        >
          ×
        </button>
        <h2>Review your proposed work</h2>
        <p>Review the exact changes before deciding what to save.</p>
        {group.map((proposal) => (
          <ActionPreview
            key={proposal.id}
            proposal={proposal}
            owner={owner}
            onUpdated={history}
            allowSending={false}
          />
        ))}
        <p className="aw-note">
          CRM records and execution audit history are retained.
        </p>
      </section>
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
            <h1 className="aw-app-title">MyARI Assistant</h1>
            <small>Your real estate relationship copilot.</small>
          </div>
          <nav aria-label="Assistant tools" className="aw-header-actions">
            <button disabled={busy || dictationBusy} onClick={newConversation}>
              ＋ New Chat
            </button>
            <button
              onClick={() => {
                if (legacyOpen) onReturn?.();
                setShowHistory(!showHistory);
                setShowPreview(false);
              }}
              aria-expanded={showHistory}
              aria-controls="aw-history"
            >
              History
            </button>
            <button
              onClick={openConcierge}
              disabled={conciergeEnabled === null}
            >
              Concierge <WorkspaceIcon name="arrow" />
            </button>
            <button onClick={returnToCrm}>
              <span className="aw-wide-label">Return to </span>CRM{" "}
              <WorkspaceIcon name="arrow" />
            </button>
            <details className="aw-more">
              <summary aria-label="More Assistant tools">•••</summary>
              <div className="aw-more-menu">
                <span className="aw-menu-label">Display mode</span>
                {(
                  [
                    ["workspace", "Full Workspace"],
                    ["overlay", "Expanded Overlay"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={mode === value}
                    onClick={(e) => {
                      changeMode(value);
                      e.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={(e) => {
                    if (!dictationBusy) onLegacy();
                    e.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                >
                  Claude draft tools
                </button>
                <button
                  onClick={(e) => {
                    setShowWork(!showWork);
                    e.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                  aria-expanded={showWork}
                >
                  Saved work
                </button>
                {messages.length > 0 &&
                  workspaceActions.map((a) => (
                    <button
                      key={a.id}
                      onClick={(e) => {
                        choosePrompt(a.prompt);
                        e.currentTarget
                          .closest("details")
                          ?.removeAttribute("open");
                      }}
                    >
                      {a.title}
                    </button>
                  ))}
                {proposals.length > 0 && (
                  <button
                    onClick={(e) => {
                      setShowPreview(!showPreview);
                      setShowHistory(false);
                      e.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                    }}
                    aria-expanded={showPreview}
                  >
                    Review proposals
                  </button>
                )}
              </div>
            </details>
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
        {legacyOpen && (
          <button className="aw-return" onClick={onReturn}>
            ← Return to Assistant
          </button>
        )}
        <div hidden={!legacyOpen} className="aw-legacy">
          {legacyContent}
        </div>
        <div hidden={legacyOpen} className="aw-layout">
          <div className="aw-scenery" aria-hidden="true">
            <Image
              src="/brand/heroes/dashboard-interior.jpg"
              alt=""
              fill
              sizes="(max-width: 1023px) 100vw, calc(100vw - 256px)"
              priority
            />
          </div>
          <aside
            id="aw-history"
            hidden={!showHistory}
            className="aw-history"
            aria-label="Conversation history"
          >
            <button
              className="aw-panel-close"
              onClick={() => setShowHistory(false)}
              aria-label="Close history"
            >
              ×
            </button>
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
            {organization.storageError && <p role="status">{organization.storageError}</p>}
            {conversations.map((r) => (
              <div className="aw-history-row" key={r.conversationId}>
              <button
                className="aw-history-item"
                aria-current={
                  conversation === r.conversationId ? "true" : undefined
                }
                key={r.conversationId}
                disabled={busy || dictationBusy}
                onClick={() => {
                  if (command.trim() || proposals.length > 0) {
                    setConfirmation({ message: "Switch conversation? Your unsent text stays in the composer. Unsubmitted proposal edits will be discarded.", accept: () => void resume(r.conversationId) });
                    return;
                  }
                  void resume(r.conversationId);
                }}
              >
                <span>{organization.pins.includes(r.conversationId) && <span className="aw-pinned-label">Pinned · </span>}{r.message.slice(0, 75)}</span>
                <small>{new Date(r.at).toLocaleDateString()}</small>
              </button>
              <button type="button" className="aw-history-options" aria-label={`Conversation options: ${r.message.slice(0, 75)}`} aria-expanded={historyMenu === r.conversationId}
                disabled={busy || dictationBusy} onClick={() => setHistoryMenu(historyMenu === r.conversationId ? null : r.conversationId)}>⋯</button>
              {historyMenu === r.conversationId && <div className="aw-history-actions" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setHistoryMenu(null); } }}>
                <button type="button" disabled={!organization.ready} onClick={() => {
                  organization.update({ pins: organization.pins.includes(r.conversationId) ? organization.pins.filter(id => id !== r.conversationId) : [...organization.pins, r.conversationId], categories: [] });
                  setHistoryMenu(null);
                }}>{organization.pins.includes(r.conversationId) ? "Unpin" : "Pin to top"}</button>
                <button type="button" disabled={busy || dictationBusy} onClick={() => remove(r.conversationId)}>Delete conversation</button>
              </div>}
              </div>
            ))}
            <button onClick={() => void history()}>Refresh history</button>
            <button
              disabled={!messages.length || busy || dictationBusy}
              onClick={() => void remove()}
            >
              Delete conversation messages
            </button>
            <div className="aw-shortcuts">
              <h2>Your workspace</h2>
              <Link href="/dashboard/campaigns">Campaign drafts →</Link>
              <Link href="/dashboard/voice-scripts">Voice Studio →</Link>
              <button
                onClick={openConcierge}
                disabled={conciergeEnabled === null}
              >
                Onboarding & setup →
              </button>
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
              {restoring && (
                <p role="status" className="aw-loading">
                  Loading your saved conversation…
                </p>
              )}
              {!messages.length && !restoring && !error && (
                <>
                  <div className="aw-hero">
                    <div>
                      <p className="aw-eyebrow">ASK. CREATE. ORGANIZE. GROW.</p>
                      <h2>
                        {firstName
                          ? `${greeting}, ${firstName}`
                          : `${greeting}.`}
                        <br />
                        <em>how can I help you today?</em>
                      </h2>
                      <p className="aw-intro">
                        Choose your next step, or ask MyARI anything about your business.
                      </p>
                    </div>
                  </div>
                  <div className="aw-quick-actions aw-capability-grid" aria-label="Start a conversation">
                    {workspaceActions.map(action => {
                      const information = capabilityInformation[action.id];
                      return <article className="aw-capability-card" key={action.id}>
                        <button type="button" className="aw-capability-start" disabled={busy || dictationBusy} onClick={() => choosePrompt(action.prompt)}>
                          <span><WorkspaceIcon name={action.id} /></span>
                          <strong>{information.title}</strong><small>{information.description}</small>
                        </button>
                        <button type="button" className="aw-capability-learn" disabled={busy || dictationBusy} aria-label={`Learn more about ${information.title}`} onClick={() => setLearnAbout(action)}>Learn More →</button>
                      </article>;
                    })}
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
                    <strong>
                      <span
                        className={`aw-avatar ${message.role === "user" ? "aw-avatar-user" : ""}`}
                        aria-hidden="true"
                      >
                        {message.role === "user" ? (
                          firstName?.slice(0, 1) || "U"
                        ) : (
                          <Image
                            src="/brand/myari-logo.png"
                            alt=""
                            width={30}
                            height={32}
                          />
                        )}
                      </span>
                      {message.role === "user" ? "You" : "MyARI"}
                    </strong>
                    <p>{message.content}</p>
                    {message.role === "assistant" &&
                      renderProposals(
                        proposalGroups.byMessage.get(index) ?? [],
                      )}
                  </article>
                ))}
              </div>
              {renderProposals(proposalGroups.unassigned)}

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
                rows={2}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Ask MyARI anything..."
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
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
                    className="assistant-primary aw-send"
                    aria-label="Send message"
                    disabled={
                      !command.trim() ||
                      !conversation ||
                      dictationBusy ||
                      needsRecovery
                    }
                    onClick={() => void run()}
                  >
                    <span aria-hidden="true">
                      {messages.length ? "↑" : "→"}
                    </span>
                  </button>
                )}
              </div>
              <p className="aw-note">
                Drafts only until approved. No automatic enrollment, sending or
                billing changes.{" "}
                {limits
                  ? `${limits.dailyInteractions} interactions / ${limits.dailyProviderCalls} provider calls per UTC day.`
                  : "Account usage limits apply."}{" "}
                {provider ? `${provider} · ${usage}` : usage}
              </p>
            </div>
          </div>
        </div>
      </section>
      {learnAbout && <CapabilityDetails title={capabilityInformation[learnAbout.id].title} explanation={capabilityInformation[learnAbout.id].explanation} onClose={() => setLearnAbout(null)} onStart={() => { const action = learnAbout; setLearnAbout(null); choosePrompt(action.prompt); requestAnimationFrame(() => panel.current?.querySelector<HTMLTextAreaElement>('[aria-label="Assistant command"]')?.focus()); }} />}
      {confirmation && <Confirmation value={confirmation} onClose={() => setConfirmation(null)} />}
    </div>
  );
}
