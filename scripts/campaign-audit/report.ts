import fs from "node:fs";
import path from "node:path";
import { PRODUCT_CAMPAIGN_TEMPLATES } from "../../lib/crm/campaign-templates";
import { renderMessage } from "../../lib/campaigns/render-message";
import { previewSequence } from "../../lib/campaigns/sequence-preview";
import { COPY, proposedDescription } from "./proposals";
const dir = path.resolve("docs/campaign-audit");
fs.mkdirSync(dir, { recursive: true });
const context = {
  contact: {
    first_name: "Jordan",
    last_name: "Lee",
    phone: "+15555550123",
    email: "jordan@example.test",
    preferred_area: "Winter Park",
    property_address: "123 Example Lane",
  },
  agentName: "Avery Agent",
  agentPhone: "+15555550199",
  brokerage: "Example Realty",
  timezone: "America/New_York",
};
const cases = {
  complete: context.contact,
  partial: { first_name: "Sam" },
  missing: {},
  malformed: {
    first_name: { value: "SENSITIVE_FIXTURE_VALUE" },
    last_name: "null",
    preferred_area: ["SENSITIVE_FIXTURE_VALUE"],
    property_address: "undefined",
  },
};
const inventory = PRODUCT_CAMPAIGN_TEMPLATES.map((t) => {
  const steps = t.steps.map((s) => {
    const channel = s.type;
    const external = ["sms", "email", "voicemail"].includes(channel);
    const proposedType = ["avatar_video", "retargeting"].includes(channel)
      ? "callback"
      : channel;
    const proposed = proposedDescription(
      proposedType,
      COPY[t.templateKey][s.order - 1],
    );
    return {
      ...s,
      variables: [
        ...new Set(s.description.match(/\[[^\]]+\]|\{\{[^}]+\}\}/g) ?? []),
      ],
      contentIssues: [
        ...(/(?:here are|here's|I pulled|I ran|sent you|just hit|had a meaningful update|recorded a short|attached\/linked|before.*gone|window closes)/i.test(
          s.description,
        )
          ? [
              "Claims specific supporting information or activity that is not supplied by this template.",
            ]
          : []),
        ...(s.type === "sms" && !/Reply STOP/i.test(s.description)
          ? [
              "Missing explicit STOP instruction; PAUSE is not an automated SMS opt-out keyword in the current receiver.",
            ]
          : []),
        ...(["avatar_video", "retargeting"].includes(channel)
          ? [
              "No implemented delivery integration; originally represented as sent or converted to email.",
            ]
          : []),
      ],
      renderedCases: external
        ? Object.fromEntries(
            Object.entries(cases).map(([name, contact]) => [
              name,
              renderMessage(
                channel as "sms" | "email" | "voicemail",
                s.description,
                s.title,
                { ...context, contact: contact as typeof context.contact },
              ),
            ]),
          )
        : {},
      proposed: { type: proposedType, description: proposed },
      preview: previewSequence(
        [
          {
            id: s.id,
            step_order: s.order,
            type: s.type,
            title: s.title,
            description: s.description,
            delay_minutes:
              (Number(s.dayLabel.match(/\d+/)?.[0] ?? 1) - 1) * 1440,
            time_label: s.timeLabel,
          },
        ],
        context,
        "2026-10-22T12:00:00Z",
      )[0],
    };
  });
  const confirmed = steps.some(
    (s) =>
      s.contentIssues.length ||
      Object.values(s.renderedCases).some((r) => !r.ok),
  );
  return {
    templateKey: t.templateKey,
    id: t.id,
    name: t.name,
    status: "bundled draft template; database instance status not verified",
    owner: "MyARI shared product definition; subscriber owner not verified",
    audience: t.audience,
    channels: [...new Set(t.steps.map((s) => s.type))],
    durationDays: t.durationDays,
    stepsReviewed: steps.length,
    enrollmentRules: t.automation ?? {
      trigger:
        "manual selection / category enrollment; audience text is not an enforced targeting rule",
    },
    classification: confirmed ? "FAIL" : "NEEDS REVIEW",
    personalizationIssues: steps.flatMap((s) =>
      s.preview.issues.map((issue) => `Step ${s.order}: ${issue}`),
    ),
    sequenceIssues: [
      "Original time labels and immediate offsets were ignored; repair is prepared, not deployed.",
      "Actual subscriber enrollment/closing/tour dates are unavailable.",
      "Reply-stop and resume repairs need staging verification before approval.",
    ],
    deliveryIssues: [
      "Real provider credentials, sender domain, callbacks and recordings have not been exercised.",
      "RVM audio is an approved asset and is not synthesized from personalized script text.",
    ],
    complianceConcerns: [
      "Generic consent schema does not prove channel-specific legal eligibility.",
      "No complete email unsubscribe/inbound reply lifecycle exists.",
      "Recipient-local jurisdiction and quiet-hour requirements need review beyond workspace timezone.",
      "Provider webhook atomic replay migration remains unapplied.",
    ],
    contentQualityIssues: steps.flatMap((s) =>
      s.contentIssues.map((issue) => `Step ${s.order}: ${issue}`),
    ),
    fixesCompleted: [
      "Shared safe renderer and final authorization boundary prepared.",
      "All original steps executed with isolated fixtures; unsafe and unsupported steps are blocked.",
      "Read-only preview, stable scheduling and revision protection prepared.",
    ],
    testResults:
      "See tests.json: actual worker/provider-boundary fixtures; no real sends.",
    remainingBlockers: [
      "Database records not accessed: no authorized subscriber owner ID supplied and configured Supabase host is not allowlisted.",
      "Draft copy, migrations, sender/integration checks and legal consent review require approval.",
    ],
    steps,
  };
});
const proposals = inventory.map((c) => ({
  templateKey: c.templateKey,
  sourceId: c.id,
  approvalRequired: true,
  originalUnchanged: true,
  campaign: {
    name: c.name + " — review draft",
    description:
      "Proposed revision. Review targeting, sender identity, consent and integrations before use.",
    audience: c.audience,
    durationDays: c.durationDays,
    goals: [],
    steps: c.steps.map((s) => ({
      id: `review-${s.order}`,
      order: s.order,
      type: s.proposed.type,
      title: s.title,
      description: s.proposed.description,
      dayLabel: s.dayLabel,
      timeLabel: s.timeLabel === "All Day" ? "9:00 AM" : s.timeLabel,
    })),
  },
}));
fs.writeFileSync(
  path.join(dir, "inventory.json"),
  JSON.stringify(
    {
      scope: "All bundled product templates; NOT a live database inventory",
      databaseCampaigns: null,
      databaseVerified: false,
      campaigns: inventory,
    },
    null,
    2,
  ),
);
fs.writeFileSync(
  path.join(dir, "proposed-copy.json"),
  JSON.stringify(proposals, null, 2),
);
let markdown =
  "# Campaign-by-campaign audit\n\nAll 11 bundled templates and all 56 steps were inspected. Subscriber database campaigns are **not verified**. No campaign is marked PASS while delivery, consent and database checks remain unresolved. Original template definitions are unchanged.\n\n| Template | ID | Steps | Classification |\n| --- | --- | ---: | --- |\n";
for (const c of inventory)
  markdown += `| ${c.name} | ${c.id} | ${c.stepsReviewed} | **${c.classification}** |\n`;
for (const c of inventory) {
  markdown += `\n## ${c.name}\n\nID: \`${c.id}\`. Owner/status: ${c.owner}; ${c.status}. Audience: ${c.audience}. Channels: ${c.channels.join(", ")}. Reviewed **${c.stepsReviewed} steps**. Classification: **${c.classification}**.\n\n`;
  for (const [title, key] of [
    ["Personalization issues", "personalizationIssues"],
    ["Sequence issues", "sequenceIssues"],
    ["Delivery issues", "deliveryIssues"],
    ["Compliance concerns", "complianceConcerns"],
    ["Content quality issues", "contentQualityIssues"],
    ["Fixes prepared", "fixesCompleted"],
    ["Remaining blockers", "remainingBlockers"],
  ] as const) {
    markdown += `### ${title}\n\n`;
    const issues = c[key];
    markdown += issues.length
      ? issues.map((v) => `- ${v}`).join("\n") + "\n"
      : "No additional issue identified by the defined synthetic checks.\n";
  }
  markdown += "\n### Every step and proposed copy\n\n";
  for (const s of c.steps) {
    markdown += `#### ${s.order}. ${s.title}\n\nChannel: ${s.type}. Timing: ${s.dayLabel}, ${s.timeLabel}; resolved fixture instant: ${s.preview.scheduledAt ?? "requires review"}. Variables: ${s.variables.join(", ") || "none"}.\n\nOriginal:\n\n> ${s.description.replaceAll("\n", "\n> ")}\n\nProposed **review-only** ${s.proposed.type} copy:\n\n> ${s.proposed.description.replaceAll("\n", "\n> ")}\n\n`;
  }
}
fs.writeFileSync(path.join(dir, "CAMPAIGNS.md"), markdown);
console.log(
  `Audit artifacts: ${inventory.length} templates, ${inventory.reduce((n, c) => n + c.steps.length, 0)} steps. No database or provider calls.`,
);
