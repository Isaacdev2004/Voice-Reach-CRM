import { CampaignsWorkspacePage } from "@/components/campaigns/campaigns-workspace-page";
import { Suspense } from "react";
export default function CampaignsPage() {
  return (
    <Suspense fallback={<p role="status">Loading campaign workspace…</p>}>
      <CampaignsWorkspacePage />
    </Suspense>
  );
}
