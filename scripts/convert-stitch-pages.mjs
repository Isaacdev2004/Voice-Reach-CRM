import fs from "fs";
import path from "path";

const root = path.resolve("stitch_voicereach_enterprise_crm");
const outDir = path.resolve("components/pages/stitch");

const pages = [
  { folder: "landing_page", name: "LandingPage", mode: "full" },
  { folder: "authentication", name: "AuthSignInPage", mode: "auth" },
  { folder: "operational_dashboard", name: "OperationalDashboardPage", mode: "dashboard" },
  { folder: "contact_management", name: "ContactManagementPage", mode: "dashboard-inner" },
  { folder: "campaign_builder", name: "CampaignBuilderPage", mode: "dashboard-inner" },
  { folder: "voice_scripts_studio", name: "VoiceScriptsStudioPage", mode: "dashboard-inner" },
  { folder: "automation_workflows", name: "AutomationWorkflowsPage", mode: "automation" },
  { folder: "advanced_analytics", name: "AdvancedAnalyticsPage", mode: "dashboard-inner" },
  { folder: "settings_workspace", name: "SettingsWorkspacePage", mode: "dashboard-inner" },
];

function extractBody(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return bodyMatch ? bodyMatch[1].trim() : "";
}

function stripDashboardShell(content) {
  return content
    .replace(/<aside[\s\S]*?<\/aside>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/\sml-64\b/g, "")
    .replace(/\spt-16\b/g, "")
    .replace(/\spt-24\b/g, "")
    .replace(/\bfixed top-0 right-0[\s\S]*?<\/header>/gi, "");
}

function extractDashboardInner(content) {
  const mainMatch = content.match(/<main[\s\S]*?>([\s\S]*)<\/main>/i);
  if (mainMatch) return mainMatch[1].trim();
  const sectionMatch = content.match(/<section[\s\S]*?>([\s\S]*)<\/section>/i);
  return sectionMatch ? sectionMatch[1].trim() : content;
}

function extractAutomation(content) {
  const stripped = stripDashboardShell(content);
  const mainMatch = stripped.match(/<main[\s\S]*?>([\s\S]*)<\/main>/i);
  return mainMatch ? mainMatch[1].trim() : stripped;
}

function toJsx(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /class="material-symbols-outlined"\s+style="font-variation-settings: 'FILL' 1;"/g,
      'class="material-symbols-outlined filled"',
    )
    .replace(/\sclass=/g, " className=")
    .replace(/\sfor=/g, " htmlFor=")
    .replace(/\sdata-icon="[^"]*"/g, "")
    .replace(/\sdata-alt="[^"]*"/g, "")
    .replace(/\sautofocus/g, "")
    .replace(/<img\b([^>]*?)\s*\/?>/gi, "<img$1 />")
    .replace(/<input\b([^>]*?)\s*\/?>/gi, "<input$1 />")
    .replace(/<br\s*\/?>/gi, "<br />")
    .replace(/\sstyle="[^"]*"/g, "")
    .replace(/selected=""/g, "")
    .replace(/disabled=""/g, "disabled")
    .replace(/\srows="(\d+)"/g, " rows={$1}")
    .replace(/\scolspan="(\d+)"/g, " colSpan={$1}")
    .replace(/\srowspan="(\d+)"/g, " rowSpan={$1}")
    .replace(/\s\/\s*\/>/g, " />")
    .replace(/\/ \/>/g, " />");
}

function wrapComponent(name, jsx) {
  const body = jsx
    .split("\n")
    .map((line) => (line.trim() ? `      ${line}` : ""))
    .join("\n");
  return `/* Auto-converted from stitch HTML */\n"use client";\n\nexport function ${name}() {\n  return (\n    <>\n${body}\n    </>\n  );\n}\n`;
}

fs.mkdirSync(outDir, { recursive: true });

for (const page of pages) {
  const htmlPath = path.join(root, page.folder, "code.html");
  const raw = fs.readFileSync(htmlPath, "utf8");
  let content = extractBody(raw);

  if (page.mode === "dashboard") {
    content = stripDashboardShell(content);
  } else if (page.mode === "dashboard-inner") {
    content = extractDashboardInner(stripDashboardShell(content));
  } else if (page.mode === "automation") {
    content = extractAutomation(content);
  } else if (page.mode === "auth") {
    content = content.replace(
      /<main className="[^"]*"/,
      '<main className="w-full max-w-[480px]"',
    );
    if (!content.includes('<main className="w-full max-w-[480px]"')) {
      content = content.replace("<main>", '<main className="w-full max-w-[480px]">');
    }
  }

  let jsx = toJsx(content);
  if (page.name === "LandingPage") {
    jsx = jsx
      .replace(
        '<button className="hidden sm:block text-label-md',
        '<a href="/sign-in" className="hidden sm:block text-label-md',
      )
      .replace(
        'Sign In</button>',
        'Sign In</a>',
      )
      .replace(
        '<button className="bg-primary text-on-primary text-label-md font-label-md px-6 py-2.5 rounded-full',
        '<a href="/sign-up" className="bg-primary text-on-primary text-label-md font-label-md px-6 py-2.5 rounded-full',
      )
      .replace(/Start Free Trial\n\s*<\/button>/g, "Start Free Trial</a>")
      .replace(
        '<button className="w-full sm:w-auto bg-primary text-on-primary',
        '<a href="/sign-up" className="w-full sm:w-auto bg-primary text-on-primary',
      )
      .replace(
        '<button className="w-full sm:w-auto bg-white text-ink px-12 py-5 rounded-full',
        '<a href="/sign-up" className="w-full sm:w-auto bg-white text-ink px-12 py-5 rounded-full',
      )
      .replace(
        /Claim Your Free Trial\n\s*<\/button>/g,
        "Claim Your Free Trial</a>",
      );
  }
  if (page.name === "AuthSignInPage") {
    jsx = jsx.replace(
      '<a className="text-secondary font-bold hover:underline" href="#">Sign Up</a>',
      '<a className="text-secondary font-bold hover:underline" href="/sign-up">Sign Up</a>',
    );
  }
  fs.writeFileSync(path.join(outDir, `${page.name}.tsx`), wrapComponent(page.name, jsx));
  console.log("Wrote", page.name);
}

const authPath = path.join(outDir, "AuthSignInPage.tsx");
let signUp = fs.readFileSync(authPath, "utf8");
signUp = signUp
  .replace("AuthSignInPage", "AuthSignUpPage")
  .replace("Welcome back", "Create your account")
  .replace(
    "Enter your credentials to access your dashboard",
    "Start your enterprise trial in minutes",
  )
  .replace('type="submit">\n                    Sign In', 'type="submit">\n                    Create Account')
  .replace("Don't have an account?", "Already have an account?")
  .replace('href="#">Sign Up</a>', 'href="/sign-in">Sign In</a>');
fs.writeFileSync(path.join(outDir, "AuthSignUpPage.tsx"), signUp);

// Activity logs page (no stitch HTML — derived from dashboard activity section)
const activityPage = `/* Activity logs — aligned with dashboard activity feed */
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
        <motion className="flex items-center justify-between border-b border-outline-variant p-lg">
          <h3 className="text-headline-md font-semibold text-primary">Recent Activity</h3>
          <div className="flex gap-2">
            <select className="h-10 rounded-full border border-outline-variant bg-surface-container-low px-4 text-label-md outline-none">
              <option>All Events</option>
              <option>Campaigns</option>
              <option>Compliance</option>
              <option>Auth</option>
            </select>
          </div>
        </motion>
        <div className="divide-y divide-outline-variant/10">
          {activities.map((item) => (
            <div
              key={item.title}
              className={\`flex cursor-pointer gap-4 p-sm transition-colors hover:bg-surface-container-low \${item.alert ? "bg-error/5" : ""}\`}
            >
              <div
                className={\`flex h-10 w-10 shrink-0 items-center justify-center rounded-full \${
                  item.tone === "error"
                    ? "bg-error-container text-error"
                    : item.tone === "tertiary"
                      ? "bg-tertiary-fixed text-on-tertiary-fixed"
                      : item.tone === "secondary"
                        ? "bg-secondary-fixed text-on-secondary-fixed"
                        : "bg-surface-container-high text-primary"
                }\`}
              >
                <Icon name={item.icon} />
              </div>
              <motion className="flex-1">
                <div className="flex justify-between">
                  <span
                    className={\`text-label-md font-bold \${item.tone === "error" ? "text-error" : "text-primary"}\`}
                  >
                    {item.title}
                  </span>
                  <span
                    className={\`text-caption \${item.tone === "error" ? "text-error" : "text-on-surface-variant"}\`}
                  >
                    {item.time}
                  </span>
                </div>
                <p className="mt-1 text-body-md text-on-surface-variant">{item.body}</p>
              </motion>
            </div>
          ))}
        </div>
      </div>
    </motion>
  );
}
`;
fs.writeFileSync(
  path.join(outDir, "ActivityLogsPage.tsx"),
  activityPage.replace(/motion/g, "div").replace(/<motion/g, "<div").replace(/<\/motion>/g, "</div>"),
);
console.log("Wrote ActivityLogsPage");
