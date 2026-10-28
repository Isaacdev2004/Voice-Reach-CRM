import React from "react";
import { createRoot } from "react-dom/client";
import { CampaignEditingWorkspace } from "../../components/campaigns/campaign-editing-workspace";
import { CampaignLibraryCard } from "../../components/campaigns/campaign-library-card";
import { CampaignPreviewDrawer } from "../../components/campaigns/campaign-preview-drawer";
import {
  AiAssistantProvider,
  useAiAssistant,
} from "../../components/ai/ai-assistant-context";
const id = "00000000-0000-4000-8000-000000000001";
const campaign = {
  id,
  name: "A thoughtful introduction",
  description: "A synthetic real estate follow-up sequence.",
  status: "draft",
  provider: "mock",
  created_at: "2026-10-27",
  updated_at: "2026-10-27",
  enrollmentCount: 0,
  channels: ["email", "sms", "voicemail"],
  stepCount: 3,
  durationMinutes: 4320,
};
function App() {
  const url = React.useSyncExternalStore(
    (fn) => {
      window.addEventListener("review:navigation", fn);
      window.addEventListener("popstate", fn);
      return () => {
        window.removeEventListener("review:navigation", fn);
        window.removeEventListener("popstate", fn);
      };
    },
    () => location.pathname,
  );
  const [preview, setPreview] = React.useState(false),
    { state } = useAiAssistant();
  const navigate = (url) => {
    history.pushState({}, "", url);
    window.dispatchEvent(new Event("review:navigation"));
  };
  return (
    <>
      <aside className="fixture-navigation">
        <h2>MyARI</h2>
        <p>Lead follow-up on autopilot.</p>
        <p>Dashboard</p>
        <p>Contacts</p>
        <strong>Campaigns</strong>
        <p>Calendar</p>
        <p>Financing & Closing</p>
        <p>AI Assistant</p>
      </aside>
      <header className="fixture-toolbar">
        Your business. Beautifully connected.
      </header>
      {url.endsWith("/workspace") ? (
        <CampaignEditingWorkspace campaignId={url.split("/")[3]} />
      ) : (
        <main className="fixture-library">
          <h1>Your campaign library</h1>
          <CampaignLibraryCard
            campaign={campaign}
            cover={{ url: "" }}
            pinned={false}
            onOpen={() => navigate(`/dashboard/campaigns/${id}/workspace`)}
            onPreview={() => setPreview(true)}
          />
        </main>
      )}
      {preview && (
        <CampaignPreviewDrawer
          campaign={campaign}
          cover={{ url: "" }}
          onClose={() => setPreview(false)}
          pinned={false}
          onPin={() => {}}
          onDuplicate={async () => {}}
          onChanged={() => {}}
        />
      )}
      {state.open && (
        <div role="status" data-testid="ai-open">
          Existing AI tools opened with campaign context. No campaign changes.
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <AiAssistantProvider>
    <App />
  </AiAssistantProvider>,
);
