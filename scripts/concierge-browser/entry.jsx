import { ConciergeWelcome } from "../../components/concierge/welcome";
import { DashboardSidebar } from "../../components/layout/dashboard-sidebar";
import React from "react";
import { createRoot } from "react-dom/client";
import { AiAssistantProvider } from "../../components/ai/ai-assistant-context";
import { ConciergeWorkspace } from "../../components/concierge/workspace";
import { ConciergeStaff } from "../../components/concierge/staff";
function DashboardDemonstration(){const [open,setOpen]=React.useState(false);return <><DashboardSidebar mobileOpen={open} onMobileClose={()=>setOpen(false)}/><main className="lg:ml-64 p-5"><button className="lg:hidden" onClick={()=>setOpen(true)}>Open navigation</button><ConciergeWelcome /></main></>;}
createRoot(document.getElementById("root")).render(
  <AiAssistantProvider>
    {location.pathname === "/dashboard" ? (
      <DashboardDemonstration />
    ) : location.pathname.includes("/admin/") ? (
      <ConciergeStaff />
    ) : (
      <ConciergeWorkspace />
    )}
  </AiAssistantProvider>,
);
