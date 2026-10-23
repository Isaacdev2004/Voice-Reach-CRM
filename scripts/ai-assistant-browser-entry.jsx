import React from "react";
import { createRoot } from "react-dom/client";
import {
  AiAssistantProvider,
  useAiAssistant,
  useAiRecordContext,
} from "../components/ai/ai-assistant-context";
import { AiAssistantSidebar } from "../components/ai/ai-assistant-sidebar";
const id = "00000000-0000-4000-8000-000000000001";
function Page() {
  const { openAssistant } = useAiAssistant();
  const [where, setWhere] = React.useState("contacts");
  useAiRecordContext({
    page: `/dashboard/${where}`,
    ...(where === "contacts" ? { contactId: id } : { taskId: id }),
  });
  return (
    <main style={{ padding: 30 }}>
      <h1>Your relationships, elevated.</h1>
      <label>
        Unsaved note
        <textarea
          aria-label="Unsaved note"
          defaultValue="Keep this unsaved work"
        />
      </label>
      <button onClick={() => openAssistant({})}>Ask MyARI</button>
      <button
        onClick={() => {
          history.pushState({}, "", "/dashboard/tasks");
          setWhere("tasks");
        }}
      >
        Go to Tasks
      </button>
      <button
        onClick={() => {
          window.__owner = "owner_b";
          window.dispatchEvent(new Event("review:auth"));
        }}
      >
        Switch synthetic account
      </button>
      <AiAssistantSidebar />
    </main>
  );
}
createRoot(document.getElementById("root")).render(
  <AiAssistantProvider>
    <Page />
  </AiAssistantProvider>,
);
