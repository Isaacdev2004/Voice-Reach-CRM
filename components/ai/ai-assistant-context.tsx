"use client";

import { useUser } from "@clerk/nextjs";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type AiTaskType =
  | "daily_briefing"
  | "email_writer"
  | "sms_writer"
  | "voicemail_script"
  | "follow_up"
  | "note_summary"
  | "next_best_action"
  | "campaign_idea";

type AiAssistantState = {
  open: boolean;
  task: AiTaskType;
  context: {
    contactId?: string;
    contactName?: string;
    contactNotes?: string;
    campaignName?: string;
    tone?: "warm" | "professional" | "concise" | "luxury";
    goal?: string;
  };
  brief?: string;
  mode: "drawer" | "overlay" | "workspace";
  tool: "assistant" | "legacy";
};

type AiAssistantContextValue = {
  state: AiAssistantState;
  openAssistant: (params: Partial<AiAssistantState>) => void;
  closeAssistant: () => void;
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
    <OwnedAiAssistantProvider key={user?.id ?? "signed-out"}>
      {children}
    </OwnedAiAssistantProvider>
  );
}
function OwnedAiAssistantProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AiAssistantState>({
    open: false,
    mode: "drawer",
    tool: "assistant",
    task: "follow_up",
    context: { tone: "luxury" },
  });

  const openAssistant = useCallback((params: Partial<AiAssistantState>) => {
    setState((prev) => ({ ...prev, ...params, open: true }));
  }, []);

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
      value={{ state, openAssistant, closeAssistant, setBrief, setTask }}
    >
      {children}
    </AiAssistantContext.Provider>
  );
}
