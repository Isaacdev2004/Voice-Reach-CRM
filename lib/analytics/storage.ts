import type { AnalyticsRange, AnalyticsSnapshot } from "./types";

export async function fetchAnalytics(
  range: AnalyticsRange = "30d",
): Promise<AnalyticsSnapshot> {
  const res = await fetch(`/api/analytics?range=${range}`, { cache: "no-store" });
  const data = (await res.json()) as AnalyticsSnapshot & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Failed to load analytics");
  return data;
}

export function exportAnalyticsCsv(snapshot: AnalyticsSnapshot) {
  const lines = [
    `VoiceReach Analytics Report — ${snapshot.rangeLabel}`,
    `Generated,${snapshot.generatedAt}`,
    `Live data,${snapshot.fromLiveData}`,
    "",
    "KPI,Value,Change",
    ...snapshot.kpis.map((k) => `${k.label},${k.value},${k.change ?? ""}`),
    "",
    "Campaign,Volume,Delivered,ROI,Status,Delivery %",
    ...snapshot.campaigns.map(
      (c) =>
        `"${c.name}",${c.volume},${c.delivered},${c.roi},${c.status},${c.deliveryRate}`,
    ),
    "",
    "Provider,Count,Share %",
    ...snapshot.providers.map((p) => `${p.name},${p.count},${p.percent}`),
    "",
    "Funnel stage,Count,Share %",
    ...snapshot.funnel.map((f) => `${f.label},${f.count},${f.percent}`),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `voicereach-analytics-${snapshot.range}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAnalyticsPdf(snapshot: AnalyticsSnapshot) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>VoiceReach Analytics — ${snapshot.rangeLabel}</title>
  <style>
    body { font-family: Georgia, serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 28px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 14px; margin-bottom: 32px; font-family: sans-serif; }
    h2 { font-size: 18px; margin-top: 28px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 13px; margin-top: 12px; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #555; }
    .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 12px; }
    .kpi { border: 1px solid #e8e0d5; border-radius: 12px; padding: 16px; }
    .kpi label { font-size: 12px; color: #888; font-family: sans-serif; display: block; }
    .kpi value { font-size: 24px; font-weight: 600; margin-top: 4px; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <h1>Performance Analytics</h1>
  <p class="meta">${snapshot.rangeLabel} · Generated ${new Date(snapshot.generatedAt).toLocaleString()}${snapshot.fromLiveData ? "" : " · Includes demo benchmarks"}</p>
  <h2>Key metrics</h2>
  <div class="kpi-grid">
    ${snapshot.kpis.map((k) => `<div class="kpi"><label>${k.label}</label><div class="kpi value">${k.value}</div><small>${k.change ?? ""}</small></div>`).join("")}
  </div>
  <h2>Campaign performance</h2>
  <table>
    <thead><tr><th>Campaign</th><th>Volume</th><th>Delivered</th><th>ROI</th><th>Status</th></tr></thead>
    <tbody>
      ${snapshot.campaigns.map((c) => `<tr><td>${c.name}</td><td>${c.volume.toLocaleString()}</td><td>${c.delivered.toLocaleString()}</td><td>${c.roi}</td><td>${c.status}</td></tr>`).join("")}
    </tbody>
  </table>
  <h2>Conversion funnel</h2>
  <table>
    <thead><tr><th>Stage</th><th>Count</th><th>Share</th></tr></thead>
    <tbody>
      ${snapshot.funnel.map((f) => `<tr><td>${f.label}</td><td>${f.count.toLocaleString()}</td><td>${f.percent}%</td></tr>`).join("")}
    </tbody>
  </table>
  <h2>Provider split</h2>
  <table>
    <thead><tr><th>Provider</th><th>Volume</th><th>Share</th></tr></thead>
    <tbody>
      ${snapshot.providers.map((p) => `<tr><td>${p.name}</td><td>${p.count.toLocaleString()}</td><td>${p.percent}%</td></tr>`).join("")}
    </tbody>
  </table>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) {
    throw new Error("Pop-up blocked — allow pop-ups to export PDF");
  }
  win.document.write(html);
  win.document.close();
}
