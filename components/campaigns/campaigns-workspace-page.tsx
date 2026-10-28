"use client";
import { PremiumDraftLibrary } from "./premium-draft-library";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CampaignListPanel } from "./campaign-list-panel";
import { CampaignBuilderPage } from "@/components/pages/stitch/CampaignBuilderPage";
export function CampaignsWorkspacePage() {
  const { user, isLoaded } = useUser();
  return isLoaded && user ? (
    <CampaignsOwnerWorkspace key={user.id} />
  ) : (
    <p role="status">Loading campaign workspace…</p>
  );
}
function CampaignsOwnerWorkspace() {
  const search = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const edit = search.get("edit");
    if (edit)
      router.replace(
        `/dashboard/campaigns/${encodeURIComponent(edit)}/workspace`,
      );
  }, [search, router]);
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
      <div className="flex justify-end px-2">
        <Link href="/dashboard/delivery" className="cl-button">
          Delivery Audit Log
        </Link>
      </div>
      <CampaignListPanel />
      <PremiumDraftLibrary />
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
