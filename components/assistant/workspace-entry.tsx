"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useAiAssistant } from "@/components/ai/ai-assistant-context";
export function AssistantWorkspaceEntry() {
  const { user } = useUser();
  const owner = user?.id;
  const { openAssistant } = useAiAssistant();
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("Checking your Assistant access…");
  useEffect(() => {
    let current = true;
    setEnabled(false);
    if (!owner) return;
    void fetch("/api/assistant/config", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (current) {
          setEnabled(response.ok && data.enabled === true);
          setStatus(
            response.ok && data.enabled
              ? "Your Assistant workspace is ready."
              : "Assistant 2.0 is not enabled for this account. Your existing draft tools remain available.",
          );
        }
      })
      .catch(() => {
        if (current)
          setStatus("Assistant access could not be checked. Please try again.");
      });
    return () => {
      current = false;
    };
  }, [owner]);
  if (enabled) return null;
  return (
    <section className="aw-entry">
      <h1>MyARI Assistant</h1>
      <p role="status">{status}</p>
      <button onClick={() => openAssistant({ open: true })}>
        Open available Assistant tools
      </button>
    </section>
  );
}
