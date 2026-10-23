/** Homepage comparison — targets "alternative to Follow Up Boss / kvCORE" intent. */
export const CRM_ALTERNATIVES = {
  headline: "Why agents choose MyARI over Follow Up Boss or kvCORE",
  subhead:
    "Built for agents who want follow-up done for them — with white-glove setup included, not another empty CRM to configure alone.",
  rows: [
    {
      label: "Primary job",
      followUpBoss: "CRM + tasks; automation varies by setup",
      kvcore: "Brokerage platform + marketing suite",
      ari: "Automated SMS, email, and ringless voicemail follow-up",
    },
    {
      label: "Getting live",
      followUpBoss: "Self-serve configuration",
      kvcore: "Broker-led rollout",
      ari: "White-glove setup on every plan (import + first campaign)",
    },
    {
      label: "Lead reactivation",
      followUpBoss: "Manual campaigns",
      kvcore: "Marketing tools + CRM",
      ari: "Multi-step drips and re-engagement workflows built in",
    },
    {
      label: "Ringless voicemail",
      followUpBoss: "Add-on / partner tools",
      kvcore: "Varies",
      ari: "Native RVM drops in campaign builder",
    },
    {
      label: "Best fit",
      followUpBoss: "Teams already deep in FUB workflows",
      kvcore: "Brokerages standardizing on kvCORE",
      ari: "Solo agents & small teams who want follow-up on autopilot",
    },
  ],
} as const;
