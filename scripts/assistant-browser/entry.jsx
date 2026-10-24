import React from "react";
import { createRoot } from "react-dom/client";
import {
  AiAssistantProvider,
  useAiAssistant,
} from "../../components/ai/ai-assistant-context";
import { OperatingAssistant } from "../../components/assistant/operating-assistant";
import { CommandCenter } from "../../components/assistant/command-center";
import { AiLaunchPricing } from "../../components/pricing/ai-launch-pricing";
import { AI_LAUNCH_PLANS } from "../../lib/billing/ai/catalog";
function App() {
  const { openAssistant } = useAiAssistant();
  if (location.pathname === "/pricing-render")
    return (
      <div className="public-site">
        <main className="public-prose">
          <AiLaunchPricing
            launch={{
              plans: AI_LAUNCH_PLANS,
              terms: "Synthetic QA only: launch terms are not activated.",
              start: "2027-01-01T00:00:00Z",
              end: "2027-04-01T00:00:00Z",
            }}
          />
        </main>
      </div>
    );
  return (
    <>
      <main>
        <label>
          Unsaved page work
          <input defaultValue="Unsent page draft" id="unsaved" />
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
          Open MyARI Assistant
        </button>
        {location.pathname === "/dashboard/assistant" && <CommandCenter />}
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
