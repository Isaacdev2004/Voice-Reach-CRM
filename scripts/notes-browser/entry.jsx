import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { NotesStrategyPage } from "../../components/pages/stitch/NotesStrategyPage";
window.__owner = "owner_a";
window.__setOwner = (owner) => {
  window.__owner = owner;
  window.dispatchEvent(new Event("review:auth"));
};
const actualFetch = window.fetch.bind(window);
window.fetch = (url, init = {}) =>
  actualFetch(url, {
    ...init,
    headers: { ...init.headers, "x-review-owner": window.__owner },
  });
class SpeechRecognition {
  start() {
    if (window.__denyMic) {
      setTimeout(() => this.onerror?.({ error: "not-allowed" }), 20);
      return;
    }
    setTimeout(
      () =>
        this.onresult?.({
          resultIndex: 0,
          results: [
            {
              isFinal: true,
              0: {
                transcript:
                  "Synthetic client requested a garden. Follow up after reviewing preferences.",
                confidence: 0.92,
              },
            },
          ],
        }),
      30,
    );
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.onend?.();
  }
}
window.SpeechRecognition = SpeechRecognition;
createRoot(document.getElementById("root")).render(
  <DashboardShell>
    <NotesStrategyPage />
  </DashboardShell>,
);
