import { readSubscriptionStatus } from "@/lib/billing/read-subscription";
import { BrandKitSchema, ownedBrandPath } from "@/lib/settings/brand-kit";
import { apiError } from "@/lib/api-response";
import { validTimeZone } from "@/lib/calendar/time";
import { applyLiveIntegrationStatus } from "@/lib/settings/live-integration-status";
import { billingForSettingsWrite } from "@/lib/billing/verification";
import { apiOk, withApiHandler } from "@/lib/api-response";
import { requireUserId } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { mergeIntegrationLists } from "@/lib/settings/merge-integrations";
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
  brandKit: BrandKitSchema.optional(),
  profile: z.object({
    fullName: z.string().trim().min(1).max(200),
    phone: z.string().max(50),
    timezone: z.string().refine(validTimeZone, "Choose a valid timezone."),
    jobTitle: z.string().max(200),
    language: z.enum(["", "en-US", "es"]).optional(),
    avatarUrl: z.string().optional(),
  }),
  workspace: z.object({
    name: z.string().trim().min(1).max(200),
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
    subscriptionStatus: z
      .enum(["none", "trialing", "active", "canceled"])
      .optional(),
  }),
  notifications: z.object({
    emailDigest: z.boolean(),
    smsAlerts: z.boolean(),
    loginAlerts: z.boolean(),
  }),
  security: z.object({
    twoFactorEnabled: z.boolean(),
  }),
  contactCategories: z.array(z.string().min(1).max(40)).max(40).optional(),
  updatedAt: z.string(),
});

const PostSchema = z.object({ settings: SettingsSchema });

async function loadSavedSettings(
  ownerId: string,
): Promise<UserSettings | null> {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("metadata, created_at")
    .eq("owner_id", ownerId)
    .eq("entity_type", "user_settings")
    .eq("action", "SETTINGS_SAVED")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("Settings could not be verified. Please retry.");
  const settings = (data?.metadata as { settings?: UserSettings })?.settings;
  if (!settings) return null;
  try {
    const parsed = SettingsSchema.parse(settings);
    if (
      parsed.profile.avatarUrl &&
      !parsed.profile.avatarUrl.startsWith("https://")
    )
      delete parsed.profile.avatarUrl;
    return parsed;
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
    integrations: mergeIntegrationLists(base.integrations, saved?.integrations),
    billing: {
      ...merged.billing,
      voiceMinutesUsed:
        minutesUsed > 0 ? minutesUsed : merged.billing.voiceMinutesUsed,
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
  let actualMfa = false;

  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email =
        (
          user.emailAddresses.find(
            (a) => a.id === user.primaryEmailAddressId,
          ) ?? user.emailAddresses[0]
        )?.emailAddress ?? "";
      clerkImageUrl = user.imageUrl;
      clerkName = [user.firstName, user.lastName].filter(Boolean).join(" ");
      actualMfa = user.twoFactorEnabled;
    } catch {
      /* clerk optional in dev */
    }
  }

  const saved = await loadSavedSettings(ownerId);
  const minutesUsed = saved?.billing.voiceMinutesUsed ?? 0;

  const base: UserSettings = {
    ...DEFAULT_SETTINGS,
    profile: {
      ...DEFAULT_SETTINGS.profile,
      fullName:
        saved?.profile.fullName ??
        (clerkName || DEFAULT_SETTINGS.profile.fullName),
    },
  };

  let settings = mergeSettings(base, saved, minutesUsed);
  if (!saved) {
    settings = {
      ...settings,
      billing: {
        ...settings.billing,
        planId: "growth",
        planName: "Choose a plan",
        monthlyPrice: 0,
        voiceMinutesLimit: 0,
        voiceMinutesUsed: minutesUsed,
        subscriptionStatus: "none",
      },
    };
  }
  settings = {
    ...settings,
    profile: {
      ...settings.profile,
      ...(clerkImageUrl ? { avatarUrl: clerkImageUrl } : {}),
    },
    security: { twoFactorEnabled: actualMfa },
    integrations: await applyLiveIntegrationStatus(
      ownerId,
      settings.integrations,
    ),
  };

  if (email) {
    const owner = settings.team.find((m) => m.role === "owner");
    if (owner) owner.email = email;
  }

  const { getPlanUsage } = await import("@/lib/billing/plan-limits");
  const planUsage = await getPlanUsage(ownerId).catch(() => null);

  const billingVerification = await readSubscriptionStatus(ownerId);
  settings.billing = {
    ...settings.billing,
    subscriptionStatus: billingVerification.status,
    billingPeriod: billingVerification.billingPeriod,
    billedAmount: billingVerification.billedAmount,
  };
  return apiOk({
    settings,
    email,
    clerkImageUrl: clerkImageUrl ?? null,
    planUsage,
    billingVerification,
  });
});

export const POST = withApiHandler(async (request) => {
  const ownerId = await requireUserId();
  const { settings: body } = PostSchema.parse(await request.json());
  if (
    body.brandKit &&
    (!ownedBrandPath(ownerId, body.brandKit.headshotPath) ||
      !ownedBrandPath(ownerId, body.brandKit.logoPath))
  )
    return apiError("Brand image ownership could not be verified.", {
      status: 400,
    });
  const saved = await loadSavedSettings(ownerId);
  const minutesUsed = saved?.billing.voiceMinutesUsed ?? 0;
  const oldOwners = saved?.team.filter((m) => m.role === "owner") ?? [];
  if (
    oldOwners.some(
      (m) => !body.team.some((n) => n.id === m.id && n.role === "owner"),
    ) ||
    body.team.some(
      (m) =>
        m.role === "owner" &&
        m.id !== ownerId &&
        !oldOwners.some((n) => n.id === m.id),
    )
  )
    return apiError(
      "Workspace ownership cannot be changed in this roster form.",
      { status: 403 },
    );
  let settings: UserSettings = {
    ...body,
    integrations: await applyLiveIntegrationStatus(ownerId, body.integrations),
    billing: billingForSettingsWrite(saved?.billing, minutesUsed),
    security: saved?.security ?? { twoFactorEnabled: false },
    updatedAt: new Date().toISOString(),
  };

  if (
    settings.brandKit?.useProfilePhoto &&
    body.profile.avatarUrl !== saved?.profile.avatarUrl
  )
    settings.brandKit = { ...settings.brandKit, approved: false };
  const savedResult = await supabaseAdmin.rpc("save_subscriber_settings", {
    p_owner: ownerId,
    p_expected: body.updatedAt,
    p_settings: settings,
  });
  if (savedResult.error?.message?.includes("SETTINGS_CONFLICT"))
    return apiError(
      "Settings changed in another session. Reload before saving to avoid overwriting changes.",
      { status: 409 },
    );
  if (savedResult.error)
    return apiError(
      "Settings could not be saved. Verify that the Settings database migration is installed, then retry.",
      { status: 503 },
    );
  settings = savedResult.data as UserSettings;

  const { userId } = await auth();
  let profileSync = false;
  let email = "";
  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      email =
        (
          user.emailAddresses.find(
            (a) => a.id === user.primaryEmailAddressId,
          ) ?? user.emailAddresses[0]
        )?.emailAddress ?? "";
      const parts = settings.profile.fullName.trim().split(/\s+/);
      await client.users.updateUser(userId, {
        firstName: parts[0] ?? user.firstName ?? undefined,
        lastName: parts.slice(1).join(" ") || user.lastName || undefined,
      });
      profileSync = true;
    } catch {
      /* non-fatal */
    }
  }

  return apiOk({ settings, email, profileSync });
});
