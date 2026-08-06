import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import type { UserSettings, WorkspaceSettings } from "@/lib/settings/types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function loadWorkspaceSettings(ownerId: string): Promise<{
  workspace: WorkspaceSettings;
  profile: UserSettings["profile"];
}> {
  const { data } = await supabaseAdmin
    .from("audit_logs")
    .select("metadata")
    .eq("owner_id", ownerId)
    .eq("entity_type", "user_settings")
    .eq("action", "SETTINGS_SAVED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const saved = (data?.metadata as { settings?: UserSettings } | null)?.settings;
  return {
    workspace: { ...DEFAULT_SETTINGS.workspace, ...(saved?.workspace ?? {}) },
    profile: { ...DEFAULT_SETTINGS.profile, ...(saved?.profile ?? {}) },
  };
}
