import { CampaignListPanel } from "@/components/campaigns/campaign-list-panel";
import { CampaignBuilderPage } from "@/components/pages/stitch/CampaignBuilderPage";

export default function CampaignsPage() {
  return (
    <div className="luxury-page space-y-0">
      <div className="mx-auto max-w-[1400px] px-8 pt-8">
        <CampaignListPanel />
      </div>
      <div id="campaign-builder">
        <CampaignBuilderPage />
      </div>
    </div>
  );
}
