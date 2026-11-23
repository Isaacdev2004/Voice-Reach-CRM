// Read-only recovery export. Run in DevTools on the SAME MyARI hostname/profile.
// Does not write or clear localStorage, call APIs, activate or save campaigns.
(() => {
  const raw = localStorage.getItem("voicereach-campaign-templates");
  if (!raw) {
    console.info("No legacy locally saved campaigns found.");
    return;
  }
  const entries = JSON.parse(raw);
  if (!Array.isArray(entries))
    throw new Error("Unexpected local format; leave storage unchanged.");
  console.table(
    entries.map((c) => ({
      name: c.name,
      savedAt: c.savedAt,
      steps: c.steps?.length,
    })),
  );
  const blob = new Blob([JSON.stringify(entries, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "myari-local-campaign-recovery.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  console.info(
    "Private recovery file downloaded. Inspect actual text before claiming recovery. Do not share other accounts’ content.",
  );
})();
