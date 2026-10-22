/* Synthetic, isolated campaign QA; no live API requests or outbound delivery. */
import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { CampaignsWorkspacePage } from "../../components/campaigns/campaigns-workspace-page";
import { DEFAULT_SETTINGS } from "../../lib/settings/defaults";
import { sequenceSummary } from "../../lib/campaigns/library-data";
import {PRODUCT_CAMPAIGN_TEMPLATES} from "../../lib/crm/campaign-templates";
import {delayFromDayLabel} from "../../lib/campaigns/delay-from-day-label";
const w = window;
w.__owner = "owner_a";
w.__setOwner = (owner) => {
  w.__owner = owner;
  window.dispatchEvent(new Event("review:auth"));
};
const id = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
const names = [
  "Residential Outreach QA",
  "Instant Response QA",
  "Re-engagement QA",
  "Buyer Nurture QA",
  "Anniversary QA",
  "Listing Alert QA",
  "Commercial Outreach QA",
  "Private Test QA",
];
w.__campaigns = names.map((name, i) => ({
  id: id(i + 1),
  owner_id: "owner_a",
  name,
  status: [
    "sending",
    "sent",
    "queued",
    "draft",
    "partial",
    "draft",
    "failed",
    "draft",
  ][i],
  provider: "live",
  live_launched: i === 0,
  created_at: `2026-10-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
  updated_at: `2026-10-${String(i + 10).padStart(2, "0")}T12:00:00Z`,
}));
w.__campaigns[0].audience = "Buyers";
w.__campaigns[0].goals = ["Nurture relationships"];
w.__campaigns[1].audience = "Sellers";
w.__campaigns[1].goals = ["Nurture relationships"];
w.__campaigns[2].audience = "Buyers";
w.__campaigns[2].goals = ["Respond quickly"];
w.__campaigns.push({
  id: id(99),
  owner_id: "owner_b",
  name: "Separate Subscriber Private Campaign",
  status: "draft",
  provider: "mock",
  created_at: "2026-10-20T12:00:00Z",
});
w.__campaigns =
  JSON.parse(sessionStorage.getItem("campaign-qa-records") || "null") ||
  w.__campaigns;
w.__steps = Object.fromEntries(
  w.__campaigns.map((c, i) => [
    c.id,
    [
      {
        id: id(100 + i * 2),
        step_order: 1,
        type: "email",
        title: "Market introduction",
        description:
          "Subject: Your next home\n\nHello {{first_name}}, here is your saved message.",
        delay_minutes: 0,
      },
      {
        id: id(101 + i * 2),
        step_order: 2,
        type: "sms",
        title: "Personal follow-up",
        description:
          "Let me know how your search is progressing. Reply STOP to opt out.",
        delay_minutes: 2880,
      },
    ],
  ]),
);
w.__steps =
  JSON.parse(sessionStorage.getItem("campaign-qa-steps") || "null") ||
  w.__steps;
w.__requests = [];
w.__forbidden = [];
const persist = () => {
  sessionStorage.setItem("campaign-qa-records", JSON.stringify(w.__campaigns));
  sessionStorage.setItem("campaign-qa-steps", JSON.stringify(w.__steps));
};
const response = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
const enrich = (c) => ({
  ...c,
  ...sequenceSummary(w.__steps[c.id] || []),
  enrollmentCount: c.id === id(1) ? 1 : 0,
});
const preview = (c) => ({
  campaign: enrich(c),
  steps: w.__steps[c.id] || [],
  recipients:
    c.id === id(1)
      ? [
          {
            id: id(400),
            contact_id: id(500),
            eligibility_status: "eligible",
            delivery_status: "delivered",
            contact: {
              id: id(500),
              first_name: "Actual",
              last_name: "Fixture Client",
              email: "fixture@example.test",
            },
          },
        ]
      : [],
  runs:
    c.id === id(1)
      ? [
          {
            id: id(600),
            step_id: w.__steps[c.id][0].id,
            recipient_id: id(400),
            status: "sent",
            executed_at: "2026-10-21T12:00:00Z",
          },
          {
            id: id(601),
            step_id: w.__steps[c.id][1].id,
            recipient_id: id(400),
            status: "scheduled",
            scheduled_at: "2026-10-30T12:00:00Z",
          },
        ]
      : [],
  engagement:
    c.id === id(1)
      ? [
          {
            id: id(700),
            event_type: "delivered",
            contact_id: id(500),
            occurred_at: "2026-10-21T12:02:00Z",
          },
          {
            id: id(701),
            event_type: "opened",
            contact_id: id(500),
            occurred_at: "2026-10-21T12:03:00Z",
          },
        ]
      : [],
  performanceAvailable: !w.__noPerformance,
});
w.fetch = async (input, init = {}) => {
  const url = new URL(String(input), location.origin),
    method = init.method || "GET";
  w.__requests.push({
    path: url.pathname,
    method,
    body: init.body ? JSON.parse(init.body) : null,
  });
  const own = w.__campaigns.filter((c) => c.owner_id === w.__owner);
  if (url.pathname === "/api/campaigns/library" && method === "GET") {
    if (w.__malformedLibrary)
      return response({ success: true, campaigns: [{ id: "broken" }] });
    if (w.__failLibrary)
      return response({ success: false, error: "private server trace" }, 503);
    return response({
      success: true,
      campaigns: w.__empty ? [] : own.map(enrich),
    });
  }
  const match = url.pathname.match(
    /^\/api\/campaigns\/library\/([a-f0-9-]{36})$/,
  );
  if (match) {
    const c = own.find((c) => c.id === match[1]);
    if (w.__failPreview)
      return response(
        { success: false, error: "private database failure" },
        503,
      );
    return c
      ? response({ success: true, ...preview(c) })
      : response({ success: false, error: "Not found" }, 404);
  }
  if (url.pathname === "/api/campaigns/builder" && method === "POST") {
    const body = JSON.parse(init.body);
    if (
      body.action !== "template" ||
      body.contactIds ||
      body.enrollAllEligible ||
      body.category
    ) {
      w.__forbidden.push(body);
      throw Error("Unsafe test request");
    }
    if (w.__failSave)
      return response({ success: false, error: "private failure" }, 500);
    const newId = id(w.__campaigns.length + 10),
      c = {
        id: newId,
        owner_id: w.__owner,
        name: body.campaign.name,
        status: "draft",
        provider: "mock",
        live_launched: false,
        created_at: "2026-10-22T12:00:00Z",
      };
    w.__campaigns.push(c);
    w.__steps[newId] = body.campaign.steps.map((s, i) => ({
      id: id(1000 + i),
      step_order: s.order,
      type: s.type,
      title: s.title,
      description: s.description,
      delay_minutes: s.delayMinutes ?? 0,
    }));
    persist();
    return response({
      success: true,
      campaignId: newId,
      status: "draft",
      message: "Draft saved.",
    });
  }
  if (url.pathname === "/api/campaigns/from-template" && method === "POST") {
    const body = JSON.parse(init.body);
    if (body.createAutomation) {
      w.__forbidden.push(body);
      throw Error("Unsafe automation");
    }
    const tpl=PRODUCT_CAMPAIGN_TEMPLATES.find(t=>t.templateKey===body.templateKey);if(!tpl)return response({success:false},400);const existing=own.find(c=>c.name===tpl.name);if(existing)return response({success:true,campaignId:existing.id,alreadyExisted:true});
    const newId=id(w.__campaigns.length+10);w.__campaigns.push({id:newId,owner_id:w.__owner,name:tpl.name,status:'draft',provider:'mock',live_launched:false,created_at:'2026-10-22T12:00:00Z'});w.__steps[newId]=tpl.steps.map((s,i)=>({id:id(2000+i),step_order:s.order,type:s.type,title:s.title,description:s.description,delay_minutes:delayFromDayLabel(s.dayLabel)}));persist();return response({success:true,campaignId:newId});
  }
  if (url.pathname === "/api/campaigns")
    return response({ success: true, campaigns: own });
  if (
    /^\/api\/campaigns\/[a-f0-9-]{36}$/.test(url.pathname) &&
    method === "PATCH"
  ) {
    w.__forbidden.push({ method, path: url.pathname });
    throw Error("Never alter execution during QA");
  }
  if (url.pathname === "/api/voice-assets")
    return response({ success: true, assets: [] });
  if (url.pathname === "/api/settings")
    return response({
      settings: {
        ...DEFAULT_SETTINGS,
        billing: { ...DEFAULT_SETTINGS.billing, subscriptionStatus: "active" },
      },
    });
  if (url.pathname === "/api/health")
    return response({ status: "ok", supabase: true, clerk: true });
  if (url.pathname === "/api/contacts")
    return response({ success: true, complete: true, contacts: [], total: 0 });
  return response(
    { success: false, error: "Not part of the isolated fixture" },
    404,
  );
};
createRoot(document.getElementById("root")).render(
  <DashboardShell>
    <CampaignsWorkspacePage />
  </DashboardShell>,
);
