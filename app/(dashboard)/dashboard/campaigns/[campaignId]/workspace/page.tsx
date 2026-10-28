import { CampaignEditingWorkspace } from "@/components/campaigns/campaign-editing-workspace";
export default async function Page({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  return <CampaignEditingWorkspace campaignId={campaignId} />;
}
