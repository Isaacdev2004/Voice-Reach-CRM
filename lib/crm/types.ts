export type TimelineEventType =
  | "voicemail"
  | "email"
  | "sms"
  | "callback"
  | "video"
  | "connection"
  | "note";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string;
  date: string;
  actor?: string;
};

export type EngagementSignal = {
  id: string;
  label: string;
  description: string;
  date: string;
  icon: string;
};

export type RelationshipTask = {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
};

export type AiSuggestion = {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionLabel?: string;
  actionHref?: string;
};

export type CampaignStepType =
  | "voicemail"
  | "avatar_video"
  | "email"
  | "sms"
  | "retargeting"
  | "callback";

export type CampaignStepStatus = "sent" | "active" | "pending" | "draft";

export type CampaignStep = {
  id: string;
  order: number;
  type: CampaignStepType;
  title: string;
  description: string;
  dayLabel: string;
  timeLabel: string;
  status: CampaignStepStatus;
};

export type CampaignDefinition = {
  id: string;
  name: string;
  description: string;
  audience: string;
  durationDays: number;
  steps: CampaignStep[];
  goals: string[];
  stats: {
    reach: number;
    replies: number;
    responseRate: number;
  };
};

export type ActivateCampaignOptions = {
  enrollAllEligible: boolean;
  contactIds?: string[];
};

export type ContactProfile = {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  company?: string;
  quote?: string;
  avatarUrl?: string;
  tags: string[];
  leadStatus: string;
  relationshipScore: number;
  enrolledCampaigns: string[];
  timeline: TimelineEvent[];
  signals: EngagementSignal[];
  tasks: RelationshipTask[];
  aiSuggestions: AiSuggestion[];
  notes: string;
  details: { label: string; value: string }[];
};

export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  change?: string;
  icon: string;
  tone?: "default" | "sage" | "bronze" | "rose";
};

export type ActivityFeedItem = {
  id: string;
  type: "voicemail" | "email" | "sms" | "callback";
  contactName: string;
  description: string;
  time: string;
};
