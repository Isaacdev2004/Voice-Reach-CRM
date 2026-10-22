"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CampaignListPanel } from "./campaign-list-panel";
import { CampaignBuilderPage } from "@/components/pages/stitch/CampaignBuilderPage";
export function CampaignsWorkspacePage() {
  const search = useSearchParams();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const update = () => {
      if (
        location.hash === "#campaign-builder" ||
        search.get("edit") ||
        search.get("new")
      )
        setOpen(true);
    };
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, [search]);
  return (
    <div className="campaigns-workspace">
      <CampaignListPanel />
      <details
        id="campaign-builder"
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
        className="cl-builder-disclosure"
      >
        <summary>
          Campaign studio <span>Build and edit your outreach sequences</span>
        </summary>
        <CampaignBuilderPage />
      </details>
    </div>
  );
}
