export type ActivityCategory =
  | "all"
  | "engagement"
  | "campaigns"
  | "contacts"
  | "voice"
  | "automation"
  | "compliance"
  | "system";

export type ActivityTone = "default" | "success" | "warning" | "error" | "accent";

export type ActivityLogEntry = {
  id: string;
  category: Exclude<ActivityCategory, "all">;
  icon: string;
  tone: ActivityTone;
  title: string;
  body: string;
  createdAt: string;
  source: "audit" | "delivery" | "seed";
  action?: string;
  entityType?: string;
  entityId?: string | null;
  href?: string;
  alert?: boolean;
  metadata?: Record<string, unknown>;
};

export type ActivityFilterState = {
  category: ActivityCategory;
  query: string;
  range: "today" | "7d" | "30d" | "all";
  showDismissed: boolean;
};
