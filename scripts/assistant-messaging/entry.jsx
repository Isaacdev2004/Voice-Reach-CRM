import React from "react";
import { createRoot } from "react-dom/client";
import {
  AiAssistantProvider,
  useAiAssistant,
} from "../../components/ai/ai-assistant-context";
import { OperatingAssistant } from "../../components/assistant/operating-assistant";
function App() {
  const { openAssistant } = useAiAssistant();
  return (
    <>
      <main>
        <label>
          Unsaved page work
          <input id="page-draft" defaultValue="Unsent CRM note" />
        </label>
        <button
          onClick={() =>
            openAssistant({
              open: true,
              context: {
                contactId: "00000000-0000-4000-8000-000000000002",
                tone: "luxury",
              },
            })
          }
        >
          Open assistant
        </button>
      </main>
      <OperatingAssistant owner="qa-owner" onLegacy={() => {}} />
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <AiAssistantProvider>
    <App />
  </AiAssistantProvider>,
);
