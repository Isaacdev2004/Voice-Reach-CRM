import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import type { UserSettings } from "@/lib/settings/types";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

const IntegrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  connected: z.boolean(),
  accountLabel: z.string().optional(),
  secretHint: z.string().optional(),
  lastSync: z.string().optional(),
});

const SettingsSchema = z.object({
  profile: z.object({
    fullName: z.string().min(1),
    phone: z.string(),
    timezone: z.string(),
    jobTitle: z.string(),
    avatarUrl: z.string().optional(),
  }),
  workspace: z.object({
    name: z.string().min(1),
    slug: z.string(),
    industry: z.string(),
    defaultSenderName: z.string(),
    quietHoursStart: z.string(),
    quietHoursEnd: z.string(),
    requireConsentProof: z.boolean(),
  }),
  integrations: z.array(IntegrationSchema),
  apiKeys: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      prefix: z.string(),
      createdAt: z.string(),
      lastUsed: z.string().optional(),
    }),
  ),
  team: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().email(),
      role: z.enum(["owner", "admin", "billing", "user"]),
      status: z.enum(["active", "pending", "inactive"]),
      avatarUrl: z.string().optional(),
      lastActive: z.string().optional(),
    }),
  ),
  billing: z.object({
    planId: z.string(),
    planName: z.string(),
    monthlyPrice: z.number(),
    voiceMinutesLimit: z.number(),
    voiceMinutesUsed: z.number(),
  }),
  notifications: z.object({
    emailDigest: z.boolean(),
    smsAlerts: z.boolean(),
    loginAlerts: z.boolean(),
  }),
  security: z.object({
    twoFactorEnabled: z.boolean(),
  }),
  updatedAt: z.string(),
});

const PostSchema = z.object({ settings: SettingsSchema });

async function usageMinutes(ownerId: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("campaign_recipients")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .in("delivery_status", ["sent", "mock_sent", "delivered"]);

  return (count ?? 0) * 2;
}

async function loadSavedSettings(ownerId: string): Promise<UserSettings | null> {
  const { data } = await supabaseAdmin
    .from("audit_logs")
    .select("metadata, created_at")
    .eq("owner_id", ownerId)
    .eq("entity_type", "user_settings")
    .eq("action", "SETTINGS_SAVED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const settings = (data?.metadata as { settings?: UserSettings })?.settings;
  if (!settings) return null;
  try {
    return SettingsSchema.parse(settings);
  } catch {
    return null;
  }
}

function mergeSettings(
  base: UserSettings,
  saved: UserSettings | null,
  minutesUsed: number,
): UserSettings {
  const merged = saved ? { ...base, ...saved } : base;
  return {
    ...merged,
    billing: {
      ...merged.billing,
      voiceMinutesUsed: minutesUsed > 0 ? minutesUsed : merged.billing.voiceMinutesUsed,
    },
    updatedAt: saved?.updatedAt ?? merged.updatedAt,
  };
}

export const GET = withApiHandler(async () => {
  const ownerId = await requireUserId();
  const { userId } = await auth();

  let email = "";
  let clerkImageUrl: string | undefined;
  let clerkName = "";

  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email = user.emailAddresses[0]?.emailAddress ?? "";
      clerkImageUrl = user.imageUrl;
      clerkName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    } catch {
      /* clerk optional in dev */
    }
  }

  const saved = await loadSavedSettings(ownerId);
  const minutesUsed = await usageMinutes(ownerId);

  const base: UserSettings = {
    ...DEFAULT_SETTINGS,
    profile: {
      ...DEFAULT_SETTINGS.profile,
      fullName: saved?.profile.fullName ?? (clerkName || DEFAULT_SETTINGS.profile.fullName),
    },
  };

  const settings = mergeSettings(base, saved, minutesUsed);

  if (email) {
    const owner = settings.team.find((m) => m.role === "owner");
    if (owner) owner.email = email;
  }

  return apiOk({ settings, email, clerkImageUrl: clerkImageUrl ?? null });
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const { settings: body } = PostSchema.parse(await request.json());
  const minutesUsed = await usageMinutes(ownerId);

  const settings: UserSettings = {
    ...body,
    billing: { ...body.billing, voiceMinutesUsed: minutesUsed || body.billing.voiceMinutesUsed },
    updatedAt: new Date().toISOString(),
  };

  await writeAuditLog({
    ownerId,
    action: "SETTINGS_SAVED",
    entityType: "user_settings",
    entityId: null,
    metadata: { settings },
  });

  const { userId } = await auth();
  let email = "";
  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email = user.emailAddresses[0]?.emailAddress ?? "";
      const parts = settings.profile.fullName.trim().split(/\s+/);
      await client.users.updateUser(userId, {
        firstName: parts[0] ?? user.firstName ?? undefined,
        lastName: parts.slice(1).join(" ") || user.lastName || undefined,
      });
    } catch {
      /* non-fatal */
    }
  }

  return apiOk({ settings, email });
});
