import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardShell } from "../components/layout/dashboard-shell";
import { OperationalDashboardPage } from "../components/pages/stitch/OperationalDashboardPage";
createRoot(document.getElementById("root")).render(
  <DashboardShell>
    <OperationalDashboardPage />
  </DashboardShell>,
);
