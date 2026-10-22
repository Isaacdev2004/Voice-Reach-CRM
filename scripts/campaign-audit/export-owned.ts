/** Explicit read-only inventory export. Never executed as part of tests/build; never writes to Supabase. */
import fs from "node:fs";
import { ownedRows } from "../../lib/campaigns/library-server";
async function main() {
  const owner = process.env.CAMPAIGN_AUDIT_OWNER_ID?.trim();
  if (!owner)
    throw new Error(
      "Set the explicitly authorized CAMPAIGN_AUDIT_OWNER_ID. No database query was made.",
    );
  const campaigns = await ownedRows<{
    id: string;
    name: string;
    status: string;
    owner_id: string;
    script_id: string;
    provider: string;
    created_at: string;
    updated_at: string;
  }>(
    "campaigns",
    "id, name, status, owner_id, script_id, provider, created_at, updated_at",
    owner,
  );
  const inventory = [];
  for (const campaign of campaigns) {
    const [steps, recipients, runs] = await Promise.all([
      ownedRows(
        "campaign_steps",
        "id, step_order, type, title, description, delay_minutes, day_label, time_label, voice_asset_id, conditions",
        owner,
        campaign.id,
      ),
      ownedRows(
        "campaign_recipients",
        "id, contact_id, eligibility_status, delivery_status, created_at",
        owner,
        campaign.id,
      ),
      ownedRows(
        "campaign_step_runs",
        "id, step_id, recipient_id, status, scheduled_at, executed_at",
        owner,
        campaign.id,
      ),
    ]);
    inventory.push({
      campaign,
      steps,
      recipients,
      runs,
      classification: "NEEDS REVIEW",
      notes:
        "Read-only database snapshot; provider delivery, recordings and legal consent not verified.",
    });
  }
  const output =
    process.env.CAMPAIGN_AUDIT_OUTPUT ??
    "/tmp/myari-owned-campaign-inventory.json";
  fs.writeFileSync(
    output,
    JSON.stringify(
      { owner, readOnly: true, campaigns: inventory },
      null,
      2,
    ).replace(/\b(?:sk_live_|sk_test_|sb_secret_)[a-zA-Z0-9_]+/g, "[REDACTED]"),
  );
  console.log(
    `Exported ${campaigns.length} authorized campaigns to a local file. No remote writes.`,
  );
}
void main().catch(() => {
  console.error(
    "Read-only inventory unavailable. Verify the authorized owner and permitted database connection; no campaign changes were made.",
  );
  process.exitCode = 1;
});
