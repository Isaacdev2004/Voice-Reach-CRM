import React from "react";
import { createRoot } from "react-dom/client";
import { AiAssistantProvider } from "../../components/ai/ai-assistant-context";
import { ConciergeWorkspace } from "../../components/concierge/workspace";
import { ConciergeStaff } from "../../components/concierge/staff";
createRoot(document.getElementById("root")).render(
  <AiAssistantProvider>
    {location.pathname.includes("/admin/") ? (
      <ConciergeStaff />
    ) : (
      <ConciergeWorkspace />
    )}
  </AiAssistantProvider>,
);
