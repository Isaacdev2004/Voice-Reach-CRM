/* Activity logs — aligned with dashboard activity feed */
"use client";

import { Icon } from "@/components/ui/icon";

const activities = [
  {
    icon: "rocket_launch",
    tone: "secondary",
    title: "Summer Blast 2024 Launched",
    time: "2 mins ago",
    body: "Campaign targeting 25,000 new leads in California is now live.",
  },
  {
    icon: "gavel",
    tone: "error",
    title: "Compliance Alert: Re-consent Needed",
    time: "45 mins ago",
    body: 'TCPA requirements changed for Florida. Update scripts for "Holiday Outreach".',
    alert: true,
  },
  {
    icon: "bolt",
    tone: "tertiary",
    title: "Automation: Lead Sync Complete",
    time: "2 hours ago",
    body: "Successfully synced 1,200 new contacts from Salesforce CRM integration.",
  },
  {
    icon: "file_upload",
    tone: "neutral",
    title: "Contact Batch Uploaded",
    time: "5 hours ago",
    body: 'Batch "Retail_Contacts_Q3" (5,000 items) processed successfully.',
  },
  {
    icon: "voicemail",
    tone: "secondary",
    title: "Voicemail Delivered",
    time: "6 hours ago",
    body: "4,210 voicemails delivered with 89% success rate for Q4 Renewal.",
  },
  {
    icon: "login",
    tone: "neutral",
    title: "User Login",
    time: "8 hours ago",
    body: "Alex Rivera signed in from Chicago, IL (Chrome / Windows).",
  },
];

export function ActivityLogsPage() {
  return (
    <div className="space-y-lg">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h2 className="text-headline-lg font-semibold tracking-tight text-primary">
            Activity Logs
          </h2>
          <p className="mt-2 text-body-lg text-on-surface-variant">
            Audit trail of campaigns, compliance events, and system actions.
          </p>
        </div>
        <button
          type="button"
          className="flex h-12 items-center gap-2 rounded-full border border-outline-variant bg-white px-6 text-label-md font-bold text-primary transition-all hover:bg-surface-container-low"
        >
          <Icon name="download" />
          Export Logs
        </button>
      </div>

      <div className="overflow-hidden rounded-[24px] bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-outline-variant p-lg">
          <h3 className="text-headline-md font-semibold text-primary">Recent Activity</h3>
          <div className="flex gap-2">
            <select className="h-10 rounded-full border border-outline-variant bg-surface-container-low px-4 text-label-md outline-none">
              <option>All Events</option>
              <option>Campaigns</option>
              <option>Compliance</option>
              <option>Auth</option>
            </select>
          </div>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {activities.map((item) => (
            <div
              key={item.title}
              className={`flex cursor-pointer gap-4 p-sm transition-colors hover:bg-surface-container-low ${item.alert ? "bg-error/5" : ""}`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  item.tone === "error"
                    ? "bg-error-container text-error"
                    : item.tone === "tertiary"
                      ? "bg-tertiary-fixed text-on-tertiary-fixed"
                      : item.tone === "secondary"
                        ? "bg-secondary-fixed text-on-secondary-fixed"
                        : "bg-surface-container-high text-primary"
                }`}
              >
                <Icon name={item.icon} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span
                    className={`text-label-md font-bold ${item.tone === "error" ? "text-error" : "text-primary"}`}
                  >
                    {item.title}
                  </span>
                  <span
                    className={`text-caption ${item.tone === "error" ? "text-error" : "text-on-surface-variant"}`}
                  >
                    {item.time}
                  </span>
                </div>
                <p className="mt-1 text-body-md text-on-surface-variant">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
