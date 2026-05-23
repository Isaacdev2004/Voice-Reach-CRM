export type SettingsTab = "profile" | "workspace" | "api" | "team" | "billing";

export type UserProfileSettings = {
  fullName: string;
  phone: string;
  timezone: string;
  jobTitle: string;
  avatarUrl?: string;
};

export type WorkspaceSettings = {
  name: string;
  slug: string;
  industry: string;
  defaultSenderName: string;
  quietHoursStart: string;
  quietHoursEnd: string;
  requireConsentProof: boolean;
};

export type IntegrationConfig = {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  accountLabel?: string;
  secretHint?: string;
  lastSync?: string;
};

export type ApiKeyRecord = {
  id: string;
  label: string;
  prefix: string;
  createdAt: string;
  lastUsed?: string;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "billing" | "user";
  status: "active" | "pending" | "inactive";
  avatarUrl?: string;
  lastActive?: string;
};

export type BillingSettings = {
  planId: string;
  planName: string;
  monthlyPrice: number;
  voiceMinutesLimit: number;
  voiceMinutesUsed: number;
};

export type NotificationSettings = {
  emailDigest: boolean;
  smsAlerts: boolean;
  loginAlerts: boolean;
};

export type SecuritySettings = {
  twoFactorEnabled: boolean;
};

export type UserSettings = {
  profile: UserProfileSettings;
  workspace: WorkspaceSettings;
  integrations: IntegrationConfig[];
  apiKeys: ApiKeyRecord[];
  team: TeamMember[];
  billing: BillingSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  updatedAt: string;
};

export type SettingsResponse = {
  settings: UserSettings;
  email: string;
  clerkImageUrl?: string;
};
