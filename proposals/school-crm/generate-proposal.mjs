import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
} from "docx";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = __dirname;

const META = {
  title: "School CRM — Custom Build Proposal",
  subtitle: "Built on the ARI Platform",
  preparedFor: "[School Name]",
  preparedBy: "[Your Name / Company]",
  date: "September 17, 2026",
  status: "Draft for Discussion",
};

const accent = "A67C5B";
const headerBg = "F5EFE4";

function cell(text, opts = {}) {
  return new TableCell({
    shading: opts.header ? { fill: headerBg, type: ShadingType.CLEAR } : undefined,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: Boolean(opts.header || opts.bold),
            size: opts.size ?? 20,
          }),
        ],
      }),
    ],
  });
}

function table(headers, rows, colWidths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: headers.map((h, i) => cell(h, { header: true, width: colWidths?.[i] })),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((c, i) => cell(c, { width: colWidths?.[i] })),
          }),
      ),
    ],
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
}

function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics })],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { after: 80 },
    bullet: { level: 0 },
    children: [new TextRun(text)],
  });
}

function spacer() {
  return new Paragraph({ spacing: { after: 160 }, children: [] });
}

function buildDocxChildren() {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: META.title, bold: true, size: 36, color: accent })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: META.subtitle, size: 24, color: "666666" })],
    }),
    p(`Prepared for: ${META.preparedFor}`),
    p(`Prepared by: ${META.preparedBy}`),
    p(`Date: ${META.date}`),
    p(`Status: ${META.status}`),
    spacer(),

    h1("1. Executive Summary"),
    p(
      "[School Name] needs a centralized system to manage family inquiries, admissions follow-up, communication, and enrollment pipeline — without juggling spreadsheets, email threads, and disconnected tools.",
    ),
    p(
      "We recommend a custom school CRM built on our existing ARI platform (proven CRM + communications engine), configured for education instead of real estate.",
    ),
    p("This approach delivers:", { bold: true }),
    bullet("Lower cost than enterprise school suites (often $1,000+/month)"),
    bullet("Features tailored to this school's workflow"),
    bullet("Dedicated account management with technical support behind the scenes"),
    bullet("Room to grow (parent portal, forms, integrations) in later phases"),
    p("Build vs. Buy:", { bold: true }),
    bullet("Buy existing if they need full school ERP (grades, attendance, billing, cafeteria, etc.)"),
    bullet(
      "Custom build (recommended) if primary need is admissions CRM + parent communication + staff workflow",
    ),
    spacer(),

    h1("2. Scope of Work — Phase 1 (Recommended)"),
    h2("Included in Phase 1"),
    p("A. Core CRM (School-Configured)", { bold: true }),
    bullet("Family & contact records (parents/guardians, students, inquiry source)"),
    bullet(
      "Custom pipeline: Inquiry → Contacted → Tour Scheduled → Applied → Accepted → Enrolled → Lost",
    ),
    bullet("Notes, tags, and activity history per family"),
    bullet("Staff roles: Admin, Admissions, Read-only"),
    p("B. Communication", { bold: true }),
    bullet("Email campaigns (newsletters, reminders, event invites)"),
    bullet("SMS to parents (opt-in / consent tracking)"),
    bullet("Message templates (tour reminder, application deadline, welcome packet)"),
    p("C. Operations", { bold: true }),
    bullet("Tasks & follow-ups (call back, send packet, schedule tour)"),
    bullet("Calendar (tours, open houses, meetings)"),
    bullet("Basic analytics (inquiries by month, conversion by stage, overdue tasks)"),
    p("D. Data & Launch", { bold: true }),
    bullet("Import existing contacts / spreadsheet"),
    bullet("School branding (logo, colors, name)"),
    bullet("Admin training session (1 × 60 minutes)"),
    bullet("30-day post-launch bug-fix window"),
    p("E. Removed / Hidden (Real Estate–Specific)", { bold: true }),
    bullet("Ringless voicemail, mortgage tools, property finder, Dotloop, RE pipeline labels"),
    spacer(),

    h2("Phase 2 (Optional — Quoted Separately)"),
    bullet("Online inquiry & application forms"),
    bullet("Parent portal (view status, upload documents)"),
    bullet("Event registration (open house RSVP)"),
    bullet("Tuition / payment reminders (no full billing unless requested)"),
    bullet("Google Classroom / existing SIS integration"),
    bullet("AI assistant for staff (draft parent emails, summarize notes)"),
    spacer(),

    h2("Out of Scope (Unless Added)"),
    bullet("Full gradebook / attendance / state reporting"),
    bullet("Payroll, accounting, cafeteria management"),
    bullet("Native mobile apps (web works on phone; dedicated app = Phase 3)"),
    spacer(),

    h1("3. Timeline"),
    table(
      ["Phase", "Duration", "Deliverable"],
      [
        ["Discovery & wireframes", "Week 1–2", "Signed scope, pipeline map, field list"],
        ["Configuration & UI rebrand", "Week 3–5", "School-branded CRM shell"],
        ["Comms + automations", "Week 6–7", "Email/SMS, templates, basic workflows"],
        ["Data import & testing", "Week 8", "Live workspace with school data"],
        ["Training & go-live", "Week 9", "Handoff + documentation"],
        ["Stabilization", "Week 10–12", "Bug fixes included in build"],
      ],
      [30, 25, 45],
    ),
    spacer(),
    p("Total Phase 1: 10–12 weeks from signed agreement and deposit."),
    p("Can compress to ~8 weeks if the school responds quickly on content and decisions.", {
      italics: true,
    }),
    spacer(),

    h1("4. Investment — One-Time Build"),
    table(
      ["Package", "Best For", "One-Time Fee"],
      [
        ["Essentials", "Small school, admissions CRM only", "$8,500"],
        ["Standard (Recommended)", "CRM + automations + import + training", "$12,500"],
        ["Plus", "Standard + inquiry forms + parent status page", "$18,500"],
      ],
      [25, 45, 30],
    ),
    spacer(),
    p("Payment Schedule (Standard Package):", { bold: true }),
    bullet("40% at signing — $5,000"),
    bullet("40% at beta/demo — $5,000"),
    bullet("20% at go-live — $2,500"),
    spacer(),

    h1("5. Monthly Costs"),
    h2("A. Platform & Infrastructure (Pass-Through)"),
    p(
      "Estimated for a small private school (~150–400 families, 5–10 staff users, moderate messaging):",
    ),
    table(
      ["Service", "Purpose", "Est. Monthly"],
      [
        ["Hosting (Vercel)", "App & API", "$20–$40"],
        ["Database (Supabase)", "Contacts, activity, settings", "$25–$75"],
        ["Authentication (Clerk)", "Staff login", "$0–$25"],
        ["Email (Resend)", "~2,000–5,000 emails/mo", "$0–$20"],
        ["SMS (Twilio)", "~300–1,000 texts/mo", "$15–$50"],
        ["Domain & misc", "SSL, monitoring", "~$5"],
        ["Infrastructure subtotal", "", "$65–$215/mo"],
      ],
      [30, 45, 25],
    ),
    spacer(),
    p("Not included for schools (savings vs. real estate stack):", { bold: true }),
    bullet("Ringless voicemail (Slybroadcast): $0 — not recommended for school use"),
    bullet("Dotloop, voice AI: $0 — not applicable"),
    bullet("Optional AI (Claude): +$20–$50/mo if staff want AI writing assistant"),
    p("Typical realistic infrastructure total: $100–$250/month depending on SMS volume."),
    spacer(),

    h2("B. Managed Service Fee"),
    p("Ongoing relationship management, monitoring, and support:"),
    table(
      ["Tier", "Includes", "Monthly"],
      [
        ["Basic", "Monitoring, minor config tweaks, email support (48hr)", "$250/mo"],
        [
          "Standard (Recommended)",
          "Basic + up to 2 hrs/mo small changes, priority support",
          "$400/mo",
        ],
        ["Premium", "Standard + quarterly review, new template/workflow setup", "$650/mo"],
      ],
      [25, 55, 20],
    ),
    spacer(),

    h2("C. All-In Monthly (What the School Pays)"),
    table(
      ["", "Low", "Typical", "High"],
      [
        ["Infrastructure", "$65", "$150", "$250"],
        ["Management fee", "$250", "$400", "$650"],
        ["School pays monthly", "~$315", "~$550", "~$900"],
      ],
      [40, 20, 20, 20],
    ),
    spacer(),
    p(
      "Positioning: All-in around $400–$600/month vs. enterprise admissions software often $1,000+/month before setup fees.",
      { bold: true },
    ),
    spacer(),

    h1("6. Updates & New Projects (After Go-Live)"),
    table(
      ["Type", "Examples", "Price"],
      [
        ["Small", "New email template, tag, pipeline tweak, 1 automation", "$350–$750"],
        ["Medium", "New form, report, integration, workflow pack", "$1,500–$3,500"],
        ["Large", "Parent portal, SIS sync, major new module", "$5,000–$15,000+"],
        ["Hourly (overflow)", "Ad-hoc requests", "$125/hr"],
      ],
      [20, 55, 25],
    ),
    spacer(),
    p("Process: School → Account Manager → Technical scope → Quote approval → Build → Invoice"),
    spacer(),

    h1("7. Competitive Comparison"),
    table(
      ["Option", "Typical Cost", "Fit for This School"],
      [
        [
          "Smiledu / full school ERP",
          "$200–$800+/mo (varies)",
          "Overkill if CRM-only; good for grades/attendance/billing",
        ],
        [
          "SchoolAdmin / Finalsite Enrollment",
          "~$1,000+/mo (custom quote)",
          "Strong admissions; expensive for small schools",
        ],
        [
          "Generic CRM (HubSpot, etc.)",
          "$50–$800/mo",
          "Flexible but not school-shaped; heavy setup",
        ],
        [
          "Custom ARI School CRM (this proposal)",
          "~$12.5K build + ~$400–$600/mo",
          "Best fit: admissions + communication + custom workflow",
        ],
      ],
      [30, 25, 45],
    ),
    spacer(),

    h1("8. What We Need from the School"),
    bullet("Approx. number of inquiries/year and enrolled students"),
    bullet("Current tools (spreadsheet, Gmail, existing CRM trial, website form)"),
    bullet("Staff count needing login"),
    bullet("Must-have vs. nice-to-have (forms, parent portal, payments)"),
    bullet("Sample inquiry → enrollment workflow"),
    bullet("Brand assets (logo, colors)"),
    bullet("Legal: data ownership; consent for SMS/email"),
    spacer(),

    h1("9. Risks & Notes"),
    bullet(
      "FERPA / privacy: Phase 1 is staff-facing CRM; parent portal in Phase 2 adds compliance review.",
    ),
    bullet("SMS: Parent opt-in required; consent flags built in — school must enforce policy."),
    bullet("Confirm exact 'Smiles' product and quote for apples-to-apples comparison."),
    bullet("Full ERP (grades, attendance) is a separate project (~$50K+) or buy off-the-shelf."),
    spacer(),

    h1("10. Recommendation"),
    table(
      ["Question", "Answer"],
      [
        ["Does school CRM differ much from ARI?", "Core engine: no. Labels, pipeline, fields: yes."],
        ["Build all or a portion?", "Portion — Phase 1 admissions CRM (~70% reuse)"],
        [
          "Build or buy?",
          "Build Phase 1 if CRM + comms is the pain; buy ERP if academic modules needed",
        ],
        ["Competitive monthly?", "Yes — target $400–$600 all-in vs. $1,000+ enterprise"],
      ],
      [45, 55],
    ),
    spacer(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
      children: [
        new TextRun({
          text: "Confidential — For discussion purposes only",
          italics: true,
          size: 18,
          color: "888888",
        }),
      ],
    }),
  ];
}

function buildHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${META.title}</title>
<style>
  @page { margin: 0.75in; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.55; font-size: 11pt; max-width: 8.5in; margin: 0 auto; padding: 24px; }
  h1 { color: #A67C5B; font-size: 20pt; border-bottom: 2px solid #F5EFE4; padding-bottom: 6px; margin-top: 28px; page-break-after: avoid; }
  h2 { color: #333; font-size: 14pt; margin-top: 20px; page-break-after: avoid; }
  .cover { text-align: center; padding: 60px 0 40px; }
  .cover h1 { border: none; font-size: 28pt; margin: 0; }
  .cover .sub { color: #666; font-size: 14pt; margin-top: 8px; }
  .meta { margin: 32px 0; }
  .meta p { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 10pt; page-break-inside: avoid; }
  th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; vertical-align: top; }
  th { background: #F5EFE4; font-weight: bold; }
  ul { margin: 8px 0 16px; padding-left: 22px; }
  li { margin-bottom: 4px; }
  p { margin: 8px 0; }
  .note { font-style: italic; color: #555; }
  .footer { text-align: center; margin-top: 40px; font-size: 9pt; color: #888; font-style: italic; }
  strong { color: #333; }
</style>
</head>
<body>
<div class="cover">
  <h1>${META.title}</h1>
  <div class="sub">${META.subtitle}</div>
</div>
<div class="meta">
  <p><strong>Prepared for:</strong> ${META.preparedFor}</p>
  <p><strong>Prepared by:</strong> ${META.preparedBy}</p>
  <p><strong>Date:</strong> ${META.date}</p>
  <p><strong>Status:</strong> ${META.status}</p>
</div>

<h1>1. Executive Summary</h1>
<p>[School Name] needs a centralized system to manage <strong>family inquiries, admissions follow-up, communication, and enrollment pipeline</strong> — without juggling spreadsheets, email threads, and disconnected tools.</p>
<p>We recommend a <strong>custom school CRM</strong> built on our existing <strong>ARI platform</strong> (proven CRM + communications engine), configured for education instead of real estate.</p>
<p><strong>This approach delivers:</strong></p>
<ul>
  <li>Lower cost than enterprise school suites (often <strong>$1,000+/month</strong>)</li>
  <li>Features tailored to this school's workflow</li>
  <li>Dedicated account management with technical support behind the scenes</li>
  <li>Room to grow (parent portal, forms, integrations) in later phases</li>
</ul>
<p><strong>Build vs. Buy:</strong></p>
<ul>
  <li><strong>Buy existing</strong> if they need full school ERP (grades, attendance, billing, cafeteria, etc.)</li>
  <li><strong>Custom build (recommended)</strong> if primary need is admissions CRM + parent communication + staff workflow</li>
</ul>

<h1>2. Scope of Work — Phase 1 (Recommended)</h1>
<h2>Included in Phase 1</h2>
<p><strong>A. Core CRM (School-Configured)</strong></p>
<ul>
  <li>Family &amp; contact records (parents/guardians, students, inquiry source)</li>
  <li>Custom pipeline: Inquiry → Contacted → Tour Scheduled → Applied → Accepted → Enrolled → Lost</li>
  <li>Notes, tags, and activity history per family</li>
  <li>Staff roles: Admin, Admissions, Read-only</li>
</ul>
<p><strong>B. Communication</strong></p>
<ul>
  <li>Email campaigns (newsletters, reminders, event invites)</li>
  <li>SMS to parents (opt-in / consent tracking)</li>
  <li>Message templates (tour reminder, application deadline, welcome packet)</li>
</ul>
<p><strong>C. Operations</strong></p>
<ul>
  <li>Tasks &amp; follow-ups (call back, send packet, schedule tour)</li>
  <li>Calendar (tours, open houses, meetings)</li>
  <li>Basic analytics (inquiries by month, conversion by stage, overdue tasks)</li>
</ul>
<p><strong>D. Data &amp; Launch</strong></p>
<ul>
  <li>Import existing contacts / spreadsheet</li>
  <li>School branding (logo, colors, name)</li>
  <li>Admin training session (1 × 60 minutes)</li>
  <li>30-day post-launch bug-fix window</li>
</ul>
<p><strong>E. Removed / Hidden (Real Estate–Specific)</strong></p>
<ul>
  <li>Ringless voicemail, mortgage tools, property finder, Dotloop, RE pipeline labels</li>
</ul>

<h2>Phase 2 (Optional — Quoted Separately)</h2>
<ul>
  <li>Online inquiry &amp; application forms</li>
  <li>Parent portal (view status, upload documents)</li>
  <li>Event registration (open house RSVP)</li>
  <li>Tuition / payment reminders</li>
  <li>Google Classroom / SIS integration</li>
  <li>AI assistant for staff</li>
</ul>

<h2>Out of Scope (Unless Added)</h2>
<ul>
  <li>Full gradebook / attendance / state reporting</li>
  <li>Payroll, accounting, cafeteria</li>
  <li>Native mobile apps (web works on phone)</li>
</ul>

<h1>3. Timeline</h1>
<table>
<tr><th>Phase</th><th>Duration</th><th>Deliverable</th></tr>
<tr><td>Discovery &amp; wireframes</td><td>Week 1–2</td><td>Signed scope, pipeline map, field list</td></tr>
<tr><td>Configuration &amp; UI rebrand</td><td>Week 3–5</td><td>School-branded CRM shell</td></tr>
<tr><td>Comms + automations</td><td>Week 6–7</td><td>Email/SMS, templates, workflows</td></tr>
<tr><td>Data import &amp; testing</td><td>Week 8</td><td>Live workspace with school data</td></tr>
<tr><td>Training &amp; go-live</td><td>Week 9</td><td>Handoff + documentation</td></tr>
<tr><td>Stabilization</td><td>Week 10–12</td><td>Bug fixes included in build</td></tr>
</table>
<p><strong>Total Phase 1:</strong> 10–12 weeks from signed agreement and deposit.</p>
<p class="note">Can compress to ~8 weeks if the school responds quickly on content and decisions.</p>

<h1>4. Investment — One-Time Build</h1>
<table>
<tr><th>Package</th><th>Best For</th><th>One-Time Fee</th></tr>
<tr><td>Essentials</td><td>Small school, admissions CRM only</td><td>$8,500</td></tr>
<tr><td><strong>Standard (Recommended)</strong></td><td>CRM + automations + import + training</td><td><strong>$12,500</strong></td></tr>
<tr><td>Plus</td><td>Standard + inquiry forms + parent status page</td><td>$18,500</td></tr>
</table>
<p><strong>Payment Schedule (Standard):</strong></p>
<ul>
  <li>40% at signing — $5,000</li>
  <li>40% at beta/demo — $5,000</li>
  <li>20% at go-live — $2,500</li>
</ul>

<h1>5. Monthly Costs</h1>
<h2>A. Platform &amp; Infrastructure (Pass-Through)</h2>
<table>
<tr><th>Service</th><th>Purpose</th><th>Est. Monthly</th></tr>
<tr><td>Hosting (Vercel)</td><td>App &amp; API</td><td>$20–$40</td></tr>
<tr><td>Database (Supabase)</td><td>Contacts, activity, settings</td><td>$25–$75</td></tr>
<tr><td>Authentication (Clerk)</td><td>Staff login</td><td>$0–$25</td></tr>
<tr><td>Email (Resend)</td><td>~2,000–5,000 emails/mo</td><td>$0–$20</td></tr>
<tr><td>SMS (Twilio)</td><td>~300–1,000 texts/mo</td><td>$15–$50</td></tr>
<tr><td>Domain &amp; misc</td><td>SSL, monitoring</td><td>~$5</td></tr>
<tr><td><strong>Infrastructure subtotal</strong></td><td></td><td><strong>$65–$215/mo</strong></td></tr>
</table>
<p><strong>Typical infrastructure total:</strong> $100–$250/month depending on SMS volume.</p>

<h2>B. Managed Service Fee</h2>
<table>
<tr><th>Tier</th><th>Includes</th><th>Monthly</th></tr>
<tr><td>Basic</td><td>Monitoring, minor tweaks, email support (48hr)</td><td>$250/mo</td></tr>
<tr><td><strong>Standard (Recommended)</strong></td><td>Basic + 2 hrs/mo changes, priority support</td><td><strong>$400/mo</strong></td></tr>
<tr><td>Premium</td><td>Standard + quarterly review, template setup</td><td>$650/mo</td></tr>
</table>

<h2>C. All-In Monthly</h2>
<table>
<tr><th></th><th>Low</th><th>Typical</th><th>High</th></tr>
<tr><td>Infrastructure</td><td>$65</td><td>$150</td><td>$250</td></tr>
<tr><td>Management fee</td><td>$250</td><td>$400</td><td>$650</td></tr>
<tr><td><strong>School pays monthly</strong></td><td><strong>~$315</strong></td><td><strong>~$550</strong></td><td><strong>~$900</strong></td></tr>
</table>
<p><strong>Positioning:</strong> All-in around $400–$600/month vs. enterprise software often $1,000+/month.</p>

<h1>6. Updates &amp; New Projects</h1>
<table>
<tr><th>Type</th><th>Examples</th><th>Price</th></tr>
<tr><td>Small</td><td>Template, tag, pipeline tweak, 1 automation</td><td>$350–$750</td></tr>
<tr><td>Medium</td><td>Form, report, integration, workflow pack</td><td>$1,500–$3,500</td></tr>
<tr><td>Large</td><td>Parent portal, SIS sync, major module</td><td>$5,000–$15,000+</td></tr>
<tr><td>Hourly</td><td>Ad-hoc requests</td><td>$125/hr</td></tr>
</table>

<h1>7. Competitive Comparison</h1>
<table>
<tr><th>Option</th><th>Typical Cost</th><th>Fit</th></tr>
<tr><td>Smiledu / full school ERP</td><td>$200–$800+/mo</td><td>Overkill if CRM-only</td></tr>
<tr><td>SchoolAdmin / Finalsite</td><td>~$1,000+/mo</td><td>Strong but expensive for small schools</td></tr>
<tr><td>Generic CRM</td><td>$50–$800/mo</td><td>Flexible, heavy setup</td></tr>
<tr><td><strong>Custom ARI School CRM</strong></td><td><strong>~$12.5K + ~$400–$600/mo</strong></td><td><strong>Best fit for admissions + comms</strong></td></tr>
</table>

<h1>8. What We Need from the School</h1>
<ul>
  <li>Inquiries/year and enrolled students</li>
  <li>Current tools in use</li>
  <li>Staff count needing login</li>
  <li>Must-have vs. nice-to-have features</li>
  <li>Sample inquiry → enrollment workflow</li>
  <li>Brand assets</li>
  <li>Data ownership and SMS/email consent policy</li>
</ul>

<h1>9. Risks &amp; Notes</h1>
<ul>
  <li>FERPA / privacy: Phase 1 is staff-facing; parent portal adds compliance review</li>
  <li>SMS requires parent opt-in</li>
  <li>Confirm exact competitor product for pricing comparison</li>
  <li>Full ERP is a separate project or buy off-the-shelf</li>
</ul>

<h1>10. Recommendation</h1>
<table>
<tr><th>Question</th><th>Answer</th></tr>
<tr><td>Does school CRM differ much from ARI?</td><td>Core engine: no. Labels, pipeline, fields: yes.</td></tr>
<tr><td>Build all or a portion?</td><td>Portion — Phase 1 admissions CRM (~70% reuse)</td></tr>
<tr><td>Build or buy?</td><td>Build Phase 1 if CRM + comms is the pain</td></tr>
<tr><td>Competitive monthly?</td><td>Yes — target $400–$600 all-in</td></tr>
</table>

<div class="footer">Confidential — For discussion purposes only</div>
</body>
</html>`;
}

async function generateDocx() {
  const doc = new Document({
    sections: [{ properties: {}, children: buildDocxChildren() }],
  });
  const buffer = await Packer.toBuffer(doc);
  const outPath = path.join(OUT_DIR, "School-CRM-Proposal.docx");
  fs.writeFileSync(outPath, buffer);
  return outPath;
}

const CHROME_PATHS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  path.join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
].filter(Boolean);

function resolveChrome() {
  for (const candidate of CHROME_PATHS) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function generatePdf() {
  const html = buildHtml();
  const htmlPath = path.join(OUT_DIR, "School-CRM-Proposal.html");
  fs.writeFileSync(htmlPath, html, "utf8");

  const executablePath = resolveChrome();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const pdfPath = path.join(OUT_DIR, "School-CRM-Proposal.pdf");
  await page.pdf({
    path: pdfPath,
    format: "Letter",
    printBackground: true,
    margin: { top: "0.75in", right: "0.75in", bottom: "0.75in", left: "0.75in" },
  });
  await browser.close();
  return pdfPath;
}

async function main() {
  console.log("Generating School CRM Proposal...");
  const docxPath = await generateDocx();
  console.log("Word:", docxPath);
  const pdfPath = await generatePdf();
  console.log("PDF:", pdfPath);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
