// Actual campaign editor; synthetic API fixtures only. No provider/network actions.
import React from "react";
import { createRoot } from "react-dom/client";
import { CampaignBuilderPage } from "../../components/pages/stitch/CampaignBuilderPage";
const w = window;
w.__owner = "synthetic-A";
w.__mode = "ok";
w.__requests = [];
w.__delay = 0;
const id = "00000000-0000-4000-8000-000000000101";
const store = () => JSON.parse(localStorage.getItem("qa-server") || "{}");
const persist = (data) =>
  localStorage.setItem("qa-server", JSON.stringify(data));
const reply = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const success = (data) => reply({ success: true, data });
const failure = (error, code = "test_failure", status = 503) =>
  reply({ success: false, error, code }, status);
w.fetch = async (input, options = {}) => {
  const url = new URL(String(input), location.origin),
    method = options.method || "GET";
  w.__requests.push({
    path: url.pathname,
    method,
    body:
      typeof options.body === "string" ? JSON.parse(options.body) : undefined,
  });
  if (w.__mode === "expired")
    return failure("Sign in required", "unauthorized", 401);
  if (url.pathname === "/api/campaign-attachments/signed-upload")
    return success({
      attachment: {
        id: "synthetic-file",
        storagePath: w.__owner + "/attachments/qa.txt",
        fileName: "qa.txt",
        mimeType: "text/plain",
        sizeBytes: 4,
      },
      signedUrl: location.origin + "/qa-upload",
    });
  if (url.pathname === "/qa-upload") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return new Response(null, { status: 200 });
  }
  if (url.pathname === "/api/voice-assets") return reply({ voiceAssets: [] });
  if (url.pathname === "/api/contacts/recipients")
    return reply({
      success: true,
      contacts: [],
      page: 1,
      pageSize: 25,
      total: 1,
      totalPages: 1,
      eligibleCount: 1,
      eligibleByCategory: { Commercial: 1 },
    });
  const db = store(),
    key = w.__owner + ":" + (url.searchParams.get("id") || id);
  if (url.pathname === "/api/campaigns/drafts" && method === "GET") {
    const item = db[key];
    return success({
      draft: item
        ? {
            revision: item.revision,
            snapshot: item.snapshot,
            state: item.state,
          }
        : null,
      versions:
        item?.versions.map((v) => ({
          revision: v.revision,
          saved_at: v.saved_at,
        })) || [],
      version:
        item?.versions.find(
          (v) => v.revision === Number(url.searchParams.get("revision")),
        ) || null,
    });
  }
  if (url.pathname.startsWith("/api/campaigns/library/")) {
    const item = db[w.__owner + ":" + url.pathname.split("/").at(-1)];
    return success({
      campaign: {
        id: url.pathname.split("/").at(-1),
        name: item?.snapshot.name || "Commercial synthetic",
        status: "draft",
      },
      steps: [],
      runs: [],
    });
  }
  if (url.pathname === "/api/campaigns/drafts" && method === "POST") {
    const b = JSON.parse(options.body),
      k = w.__owner + ":" + b.campaignId,
      item = db[k];
    if (w.__delay) await new Promise((r) => setTimeout(r, w.__delay));
    if (w.__mode === "invalidDraft")
      return failure(
        "Synthetic draft validation failed",
        "validation_error",
        400,
      );
    if (w.__mode === "offline") throw Error("Synthetic network failure");
    if (w.__mode === "conflict")
      return failure("Newer revision exists", "revision_conflict", 409);
    if ((item?.revision || 0) !== b.expectedRevision)
      return failure("Revision conflict", "revision_conflict", 409);
    const revision = (item?.revision || 0) + 1,
      result = {
        revision,
        snapshot: b.snapshot,
        state: "draft",
        versions: [
          {
            revision,
            snapshot: b.snapshot,
            saved_at: new Date().toISOString(),
          },
          ...(item?.versions || []),
        ],
      };
    db[k] = result;
    persist(db);
    return success({
      revision,
      snapshot: b.snapshot,
      savedAt: new Date().toISOString(),
    });
  }
  if (url.pathname === "/api/campaigns/builder") {
    const b = JSON.parse(options.body),
      item = db[w.__owner + ":" + b.campaignId];
    if (!item || item.revision !== b.savedRevision)
      return failure("Wrong revision", "revision_conflict", 409);
    if (w.__mode === "invalid")
      return failure(
        "Synthetic activation validation failed",
        "campaign_not_ready",
        400,
      );
    item.state = "activated";
    persist(db);
    return success({
      campaignId: b.campaignId,
      status: "queued",
      message: "Synthetic activation only; no sending.",
    });
  }
  return failure("Unexpected synthetic endpoint " + url.pathname);
};
createRoot(document.getElementById("root")).render(
  <main className="p-6">
    <CampaignBuilderPage />
  </main>,
);
