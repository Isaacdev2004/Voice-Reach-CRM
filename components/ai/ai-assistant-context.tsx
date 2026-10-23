"use client";

import { useUser } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type AiTaskType =
  | "email_writer"
  | "sms_writer"
  | "voicemail_script"
  | "follow_up"
  | "note_summary"
  | "next_best_action"
  | "campaign_idea";

type RecordContext = {
  page: string;
  contactId?: string;
  campaignId?: string;
  noteId?: string;
  taskId?: string;
  scriptId?: string;
};

type AiAssistantState = {
  recordContext?: RecordContext;
  launchPage?: string;
  open: boolean;
  task: AiTaskType;
  context: {
    contactId?: string;
    campaignId?: string;
    taskId?: string;
    noteId?: string;
    scriptId?: string;
    contactName?: string;
    contactNotes?: string;
    campaignName?: string;
    tone?: "warm" | "professional" | "concise" | "luxury";
    goal?: string;
  };
  brief?: string;
};

type AiAssistantContextValue = {
  state: AiAssistantState;
  openAssistant: (params: Partial<AiAssistantState>) => void;
  closeAssistant: () => void;
  setRecordContext: (context?: RecordContext) => void;
  setBrief: (brief: string) => void;
  setTask: (task: AiTaskType) => void;
};

const AiAssistantContext = createContext<AiAssistantContextValue | null>(null);

export function useAiAssistant() {
  const ctx = useContext(AiAssistantContext);
  if (!ctx)
    throw new Error("useAiAssistant must be used within AiAssistantProvider");
  return ctx;
}

export function AiAssistantProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  return (
    <AssistantProviderSession key={user?.id ?? "signed-out"}>
      {children}
    </AssistantProviderSession>
  );
}
function AssistantProviderSession({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AiAssistantState>({
    open: false,
    task: "follow_up",
    context: { tone: "luxury" },
  });

  const openAssistant = useCallback((params: Partial<AiAssistantState>) => {
    setState((prev) => ({
      ...prev,
      ...params,
      launchPage: window.location.pathname,
      open: true,
    }));
  }, []);

  const setRecordContext = useCallback(
    (recordContext?: RecordContext) =>
      setState((prev) => ({ ...prev, recordContext })),
    [],
  );

  const closeAssistant = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const setBrief = useCallback((brief: string) => {
    setState((prev) => ({ ...prev, brief }));
  }, []);

  const setTask = useCallback((task: AiTaskType) => {
    setState((prev) => ({ ...prev, task }));
  }, []);

  return (
    <AiAssistantContext.Provider
      value={{
        state,
        openAssistant,
        closeAssistant,
        setBrief,
        setTask,
        setRecordContext,
      }}
    >
      {children}
    </AiAssistantContext.Provider>
  );
}

/** Register stable saved-record IDs only. Draft text is never sent implicitly. Optional outside dashboard. */
export function useAiRecordContext(record: RecordContext) {
  const ctx = useContext(AiAssistantContext),
    register = ctx?.setRecordContext;
  const value = JSON.stringify(record);
  useEffect(() => {
    if (!register) return;
    register(JSON.parse(value));
    return () => register(undefined);
  }, [register, value]);
}
