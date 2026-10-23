import React from "react";
import { createRoot } from "react-dom/client";
import { DashboardShell } from "../../components/layout/dashboard-shell";
import { DeliveryAuditPage } from "../../components/delivery/delivery-audit-page";
import {
  messageRecord,
  summarizeDelivery,
  buildProviderHealth,
} from "../../lib/delivery/metrics";
import { queryDelivery } from "../../lib/delivery/query";
const w = window;
w.__owner = "owner_a";
w.__fail = false;
w.__canReconcile = false;
const syncs = [];
w.__requests = [];
w.__setOwner = (owner) => {
  w.__owner = owner;
  w.dispatchEvent(new Event("review:auth"));
};
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const date = "2026-10-22T10:00:00.000Z";
const records = Array.from({ length: 35 }, (_, i) => {
  const provider =
    i % 3 === 0 ? "twilio" : i % 3 === 1 ? "resend" : "slybroadcast";
  const channel = i % 3 === 0 ? "sms" : i % 3 === 1 ? "email" : "voicemail";
  const status =
    i % 4 === 0
      ? "delivered"
      : i % 4 === 1
        ? "sent"
        : i % 4 === 2
          ? "failed"
          : "accepted";
  const message = {
    id: id(i + 1),
    owner_id: "owner_a",
    logical_key: `message-${i}`,
    provider,
    channel,
    campaign_id: id(80),
    contact_id: id(i + 100),
    step_id: id(90),
    recipient_id: id(i + 200),
    provider_message_id: `ref-fixture-${i}`,
    created_at: date,
    body: `Hi Jordan, would you like to review your home search? Reply whenever convenient.`,
    subject: channel === "email" ? "Your home search" : null,
    submission_status: "accepted",
    error_code: status === "failed" ? "30007" : null,
  };
  const events = [
    {
      id: id(i + 300),
      owner_id: "owner_a",
      message_id: message.id,
      provider,
      event_key: `event-${i}`,
      event_type: status,
      occurred_at: status === "delivered" ? date : null,
      received_at: date,
      source: status === "accepted" ? "submission" : "webhook",
      error_code: status === "failed" ? "30007" : null,
    },
  ];
  return messageRecord(message, events, {
    contact: `Jordan ${i + 1}`,
    campaign: "Buyer Relationship Follow-up",
    step: "Thoughtful check-in",
  });
});
const response = (json, status = 200) =>
  new Response(JSON.stringify(json), {
    status,
    headers: { "content-type": "application/json" },
  });
w.fetch = async (input, init = {}) => {
  const url = new URL(
    typeof input === "string" ? input : input.url,
    location.origin,
  );
  w.__requests.push({ path: url.pathname, method: init.method ?? "GET" });
  if (url.pathname === "/api/delivery/reconcile" && init.method === "POST") {
    const body = JSON.parse(init.body);
    if (
      !w.__canReconcile ||
      !body.confirmReadOnly ||
      !["sms", "email"].includes(body.channel)
    )
      return response({ error: "Not authorized in fixture" }, 403);
    syncs.push({
      id: id(999),
      owner_id: w.__owner,
      channel: body.channel,
      provider: body.channel === "sms" ? "twilio" : "resend",
      attempted_at: date,
      succeeded_at: date,
      error_code: null,
    });
    return response({ checked: 1, errorCode: null });
  }
  if ((init.method ?? "GET") !== "GET")
    throw Error("Browser QA never mutates data");
  if (url.pathname === "/api/delivery") {
    if (w.__fail) return response({ error: "Synthetic unavailable" }, 503);
    const owned = w.__owner === "owner_a" ? records : [];
    const health = buildProviderHealth(
      owned,
      syncs.filter((s) => s.owner_id === w.__owner),
      {
        sms: true,
        email: true,
        voicemail: true,
      },
    );
    if (url.searchParams.has("id")) {
      const record = owned.find((r) => r.id === url.searchParams.get("id"));
      return record
        ? response({
            record,
            attempts: [
              {
                id: record.id,
                status: record.status,
                created_at: record.created_at,
                provider_message_id: record.provider_message_id,
              },
            ],
            health: health.find((h) => h.channel === record.channel),
          })
        : response({ error: "Not found" }, 404);
    }
    const result = queryDelivery(owned, {
      ...Object.fromEntries(url.searchParams),
      page: Number(url.searchParams.get("page") ?? 1),
    });
    return response({
      records: result.rows.map(({ body, subject, events, ...r }) => r),
      metrics: summarizeDelivery(result.matching),
      page: result.page,
      pages: result.pages,
      total: result.total,
      health,
      canReconcile: w.__canReconcile,
      coverage:
        "Synthetic browser fixture. No real records or providers accessed.",
      options: {
        campaigns: [{ id: id(80), name: "Buyer Relationship Follow-up" }],
        contacts: owned.map((r) => ({ id: r.contact_id, name: r.contact })),
      },
    });
  }
  if (url.pathname === "/api/settings")
    return response({
      settings: {
        profile: { fullName: "Synthetic Reviewer" },
        workspace: { name: "QA workspace" },
      },
    });
  if (url.pathname === "/api/billing/status")
    return response({ status: "active", plan: "pro" });
  if (url.pathname === "/api/activity") return response({ entries: [] });
  return response({ error: "Not part of fixture" }, 404);
};
createRoot(document.getElementById("root")).render(
  <DashboardShell>
    <DeliveryAuditPage />
  </DashboardShell>,
);
