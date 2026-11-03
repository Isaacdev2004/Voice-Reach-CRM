/* eslint-disable @next/next/no-img-element -- Local fixture chrome, not application image delivery. */
import React from "react";
import { createRoot } from "react-dom/client";
import {
  AiAssistantProvider,
  useAiAssistant,
} from "../../components/ai/ai-assistant-context";
import { AiAssistantSidebar } from "../../components/ai/ai-assistant-sidebar";
import { dashboardNav } from "../../lib/navigation";
import Link from "./link";
function App() {
  const { openAssistant } = useAiAssistant();
  return (
    <>
      <aside className="fixture-nav">
        <img
          src="/brand/myari-logo.png"
          alt="MyARI"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
        <h2>MyARI</h2>
        {dashboardNav.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </aside>
      <header className="fixture-header">
        <span>Your business. Beautifully connected.</span>
        <button onClick={() => openAssistant({})}>Ask MyARI</button>
      </header>
      <main className="fixture-main">
        <h1>CRM workspace</h1>
        <label>
          Unsaved CRM work
          <input id="crm-draft" defaultValue="Keep my draft" />
        </label>
        <button onClick={() => openAssistant({})}>Open Assistant</button>
      </main>
      <AiAssistantSidebar />
    </>
  );
}
createRoot(document.getElementById("root")).render(
  <AiAssistantProvider>
    <App />
  </AiAssistantProvider>,
);
