import type { CampaignDefinition, CampaignStep, CampaignStepStatus } from "./types";

type DbCampaignStep = {
  id: string;
  step_order: number;
  type: string;
  title: string;
  description?: string | null;
  day_label?: string | null;
  time_label?: string | null;
  status?: string | null;
};

type DbCampaign = {
  id: string;
  name: string;
  status?: string | null;
  script_id?: string | null;
};

function mapDbStepStatus(status: string | null | undefined): CampaignStepStatus {
  if (status === "sent") return "sent";
  if (status === "active") return "active";
  if (status === "paused") return "pending";
  return "draft";
}

export function dbStepsToCampaignSteps(rows: DbCampaignStep[]): CampaignStep[] {
  return rows.map((row) => ({
    id: row.id,
    order: row.step_order,
    type: row.type as CampaignStep["type"],
    title: row.title,
    description: row.description ?? "",
    dayLabel: row.day_label ?? `Day ${row.step_order}`,
    timeLabel: row.time_label ?? "9:00 AM",
    status: mapDbStepStatus(row.status),
  }));
}

export function campaignFromApi(
  record: DbCampaign,
  steps: DbCampaignStep[],
  overrides?: Partial<Pick<CampaignDefinition, "description" | "audience" | "goals">>,
): CampaignDefinition {
  const campaignSteps = dbStepsToCampaignSteps(steps);
  const maxDay = campaignSteps.reduce((max, s) => {
    const match = s.dayLabel.match(/\d+/);
    const day = match ? Number.parseInt(match[0], 10) : 1;
    return Math.max(max, day);
  }, 1);

  return {
    id: record.script_id?.replace(/^builder-/, "") || record.id,
    name: record.name,
    description: overrides?.description ?? "",
    audience: overrides?.audience ?? "Selected contacts",
    durationDays: maxDay,
    steps: campaignSteps,
    goals: overrides?.goals ?? [],
    stats: { reach: 0, replies: 0, responseRate: 0 },
  };
}

export function createBlankCampaign(): CampaignDefinition {
  return {
    id: `campaign-${crypto.randomUUID()}`,
    name: "Untitled campaign",
    description: "Describe who this sequence is for and what outcome you want.",
    audience: "Selected contacts",
    durationDays: 1,
    goals: [],
    stats: { reach: 0, replies: 0, responseRate: 0 },
    steps: [],
  };
}
