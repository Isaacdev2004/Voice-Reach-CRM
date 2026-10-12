import { CampaignListPanel } from "@/components/campaigns/campaign-list-panel";
import { CampaignBuilderPage } from "@/components/pages/stitch/CampaignBuilderPage";
import { DASHBOARD_PAGE_BODY } from "@/lib/dashboard/layout";
import { Suspense } from "react";

export default function CampaignsPage() {
  return (
    <div className="luxury-page space-y-0">
      <div className={DASHBOARD_PAGE_BODY}>
        <CampaignListPanel />
      </div>
      <div id="campaign-builder">
        <Suspense
          fallback={
            <div className="p-8 text-center text-[14px] text-taupe">Loading campaign builder…</div>
          }
        >
          <CampaignBuilderPage />
        </Suspense>
      </div>
    </div>
  );
}
