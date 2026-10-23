import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { FinancingStudio } from "../../components/financing/financing-studio";
window.__owner = "owner_a";
createRoot(document.getElementById("root")).render(
  <DashboardShell>
    <FinancingStudio />
  </DashboardShell>,
);
