import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { MessagingSetupSchema, type MessagingSetup } from "./setup-schema";
export async function readMessagingSetup(owner: string) {
  const r = await supabaseAdmin.from("audit_logs").select("metadata,created_at")
    .eq("owner_id", owner).eq("entity_type", "managed_messaging_setup")
    .eq("action", "MANAGED_MESSAGING_SETUP_SAVED").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (r.error) throw Error("Messaging setup could not be loaded.");
  const parsed = MessagingSetupSchema.safeParse(r.data?.metadata?.setup);
  return parsed.success ? { setup: parsed.data, version: String(r.data?.metadata?.version ?? ""), savedAt: r.data!.created_at } : null;
}
export async function saveMessagingSetup(owner: string, setup: MessagingSetup) {
  const parsed = MessagingSetupSchema.parse(setup);
  const version = createHash("sha256").update(JSON.stringify(parsed)).digest("hex");
  const current = await readMessagingSetup(owner);
  if (current?.version === version) return current; // Repeated clicks don't append duplicate setup versions.
  const r = await supabaseAdmin.from("audit_logs").insert({
    owner_id: owner, entity_type: "managed_messaging_setup", action: "MANAGED_MESSAGING_SETUP_SAVED",
    metadata: { setup: parsed, version, selfAttestationOnly: true },
  });
  if (r.error) throw Error("Messaging setup could not be saved.");
  return { setup: parsed, version, savedAt: new Date().toISOString() };
}
