export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

export type AnalyticsKpi = {
  id: string;
  label: string;
  value: string;
  change?: string;
  changeTone?: "up" | "down" | "neutral";
  icon: string;
  tone: "default" | "sage" | "bronze" | "rose";
};

export type TrendPoint = {
  label: string;
  connected: number;
  failed: number;
};

export type ProviderSlice = {
  id: string;
  name: string;
  count: number;
  percent: number;
};

export type FunnelStage = {
  id: string;
  label: string;
  count: number;
  percent: number;
};

export type CampaignMetric = {
  id: string;
  name: string;
  subtitle: string;
  volume: number;
  delivered: number;
  roi: string;
  roiTone: "good" | "warn" | "neutral";
  status: string;
  deliveryRate: number;
};

export type ChannelMetric = {
  id: string;
  channel: string;
  icon: string;
  sent: number;
  rate: number;
};

export type AnalyticsSnapshot = {
  range: AnalyticsRange;
  rangeLabel: string;
  generatedAt: string;
  fromLiveData: boolean;
  kpis: AnalyticsKpi[];
  trends: TrendPoint[];
  providers: ProviderSlice[];
  funnel: FunnelStage[];
  campaigns: CampaignMetric[];
  channels: ChannelMetric[];
  totals: {
    outreach: number;
    contacts: number;
    campaigns: number;
  };
};
