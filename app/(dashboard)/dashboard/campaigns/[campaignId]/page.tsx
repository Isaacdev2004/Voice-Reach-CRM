import { CampaignDetailPage } from "@/components/campaigns/campaign-detail-page";

type PageProps = {
  params: Promise<{ campaignId: string }>;
};

export default async function CampaignDetail({ params }: PageProps) {
  const { campaignId } = await params;
  return <CampaignDetailPage campaignId={campaignId} />;
}
