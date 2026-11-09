import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { SettingsWorkspacePage } from "../../components/pages/stitch/SettingsWorkspacePage";
window.__owner = "owner_a";
window.__setOwner = (owner) => {
  window.__owner = owner;
  window.dispatchEvent(new Event("review:auth"));
};
const nativeFetch = window.fetch.bind(window);
window.fetch = (url, options = {}) =>
  nativeFetch(url, {
    ...options,
    headers: { ...options.headers, "x-review-owner": window.__owner },
  });
createRoot(document.getElementById("root")).render(
  <DashboardShell>
    <SettingsWorkspacePage />
  </DashboardShell>,
);
