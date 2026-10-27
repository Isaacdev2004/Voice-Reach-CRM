import type { CaseRecord } from "./schema";
import { training, communicationMilestones } from "./schema";
export function readiness(
  c: CaseRecord | null,
  facts: {
    imported: boolean;
    campaignDraft: boolean;
    integrationsVerified: boolean;
  },
) {
  const d = c?.discovery,
    m = c?.milestones;
  const checks = [
    {
      key: "discovery",
      label: "Business profile",
      done: !!(d?.agentName && d?.market && d?.goals),
      href: "#discovery",
    },
    {
      key: "migration",
      label: "Contacts imported or intentionally skipped",
      done: facts.imported || m?.importSkipped === true,
      href: "#migration",
    },
    {
      key: "stages",
      label: "Contact stages reviewed",
      done: m?.stagesReviewed === true,
      href: "/dashboard/contacts",
    },
    {
      key: "campaign",
      label: "First campaign saved as a draft",
      done: facts.campaignDraft,
      href: "#campaigns",
    },
    {
      key: "review",
      label: "Campaign reviewed by subscriber",
      done: facts.campaignDraft && m?.campaignReviewed === true,
      href: "/dashboard/campaigns",
    },
    {
      key: "integrations",
      label: "Integrations verified or marked not applicable",
      done: facts.integrationsVerified || m?.integrationsNotApplicable === true,
      href: "#integrations",
    },
    {
      key: "training",
      label: "Core walkthroughs completed",
      done: training.every((t) => m?.training?.includes(t.key)),
      href: "#training",
    },
    {
      key: "launch",
      label: "Launch readiness personally reviewed",
      done: m?.launchReview === true,
      href: "#review",
    },
  ];
  const completed = checks.filter((x) => x.done).length;
  const missing = checks.filter((x) => !x.done);
  return {
    checks,
    completed,
    total: checks.length,
    percent: Math.round((completed / checks.length) * 100),
    next: missing[0] ?? null,
    ready: missing.length === 0,
  };
}
export function suggestedCommunications(
  c: CaseRecord,
  facts: {
    imported: boolean;
    campaignDraft: boolean;
    integrationsVerified: boolean;
  },
) {
  const progress = readiness(c, facts),
    days = Math.floor(
      (Date.now() - new Date(c.created_at).getTime()) / 86400000,
    );
  return communicationMilestones
    .filter(
      (x) =>
        days >= x.day &&
        (x.key !== "discovery" || !progress.checks[0].done) &&
        (x.key !== "migration" || !progress.checks[1].done) &&
        (x.key !== "campaign" || !facts.campaignDraft) &&
        (x.key !== "training" || !progress.checks[6].done),
    )
    .map((x) => ({
      ...x,
      status: c.discovery.communicationsConsent
        ? "Draft; approval required"
        : "Draft; subscriber communication consent required",
    }));
}
