"use client";

import { ApiKeyModal } from "@/components/settings/api-key-modal";
import { InAppBrowserBanner } from "@/components/auth/in-app-browser-banner";
import { IntegrationConfigModal } from "@/components/settings/integration-config-modal";
import { InviteMemberModal } from "@/components/settings/invite-member-modal";
import { TeamMemberModal } from "@/components/settings/team-member-modal";
import { useUpgradePlan } from "@/components/billing/upgrade-plan-provider";
import { LuxuryCard } from "@/components/crm/luxury-card";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { connectDotloop } from "@/lib/connect-dotloop";
import { connectGoogleCalendar } from "@/lib/connect-google-calendar";
import { formatRelativeTime } from "@/lib/activity/format";
import { TIMEZONE_OPTIONS } from "@/lib/settings/defaults";
import { useDashboardSearch } from "@/lib/hooks/use-dashboard-search";
import {
  fetchSettings,
  generateApiKey,
  persistSettings,
  saveSettingsLocal,
} from "@/lib/settings/storage";
import type {
  IntegrationConfig,
  SettingsTab,
  TeamMember,
  UserSettings,
} from "@/lib/settings/types";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Toast = { message: string; tone: "success" | "error" };

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "workspace", label: "Workspace" },
  { id: "api", label: "API keys" },
  { id: "team", label: "Team" },
  { id: "billing", label: "Billing" },
];

const ROLE_LABELS: Record<TeamMember["role"], string> = {
  owner: "Workspace owner",
  admin: "Admin",
  billing: "Billing manager",
  user: "User",
};

export function SettingsWorkspacePage() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openUpgrade, billing: sharedBilling, lastUpgradedAt, subscriptionActive } =
    useUpgradePlan();
  const [portalLoading, setPortalLoading] = useState(false);
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [planUsage, setPlanUsage] = useState<{
    contactsUsed: number;
    contactsLimit: number | null;
    smsUsed: number;
    smsIncluded: number;
    rvmUsed: number;
    rvmIncluded: number;
    emailUsed: number;
    emailIncluded: number;
    paygEstimatedCents?: number;
    paygSmsCents?: number;
    paygRvmCents?: number;
  } | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState("");
  const [profileEditing, setProfileEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [integrationModal, setIntegrationModal] = useState<IntegrationConfig | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [apiKeyOpen, setApiKeyOpen] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);
  const [teamMemberModal, setTeamMemberModal] = useState<TeamMember | null>(null);

  const showToast = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchSettings();
      setSettings(data.settings);
      setPlanUsage(data.planUsage ?? null);
      setSavedSnapshot(JSON.stringify(data.settings));
      setEmail(data.email || user?.primaryEmailAddress?.emailAddress || "");
      saveSettingsLocal(data.settings);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Could not load settings", "error");
    } finally {
      setLoading(false);
    }
  }, [user?.primaryEmailAddress?.emailAddress]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncGoogleCalendarStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/google/status");
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.connected) return;
      setSettings((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          integrations: prev.integrations.map((item) =>
            item.id === "google-calendar"
              ? {
                  ...item,
                  connected: true,
                  accountLabel: data.accountEmail ?? "Google account",
                  lastSync: data.lastUpdated ?? new Date().toISOString(),
                }
              : item,
          ),
        };
      });
    } catch {
      /* ignore */
    }
  }, []);

  const syncLiveIntegrations = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/status");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setSettings((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          integrations: prev.integrations.map((item) => {
            if (item.id === "claude") {
              return {
                ...item,
                connected: Boolean(data.claude?.configured),
                accountLabel: data.claude?.configured ? data.claude.model : undefined,
              };
            }
            if (item.id === "dotloop") {
              return {
                ...item,
                connected: Boolean(data.dotloop?.connected),
                accountLabel: data.dotloop?.accountLabel ?? undefined,
              };
            }
            return item;
          }),
        };
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void syncGoogleCalendarStatus();
    void syncLiveIntegrations();
  }, [syncGoogleCalendarStatus, syncLiveIntegrations]);

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (
      requestedTab === "profile" ||
      requestedTab === "workspace" ||
      requestedTab === "api" ||
      requestedTab === "team" ||
      requestedTab === "billing"
    ) {
      setTab(requestedTab);
    }

    const calendar = searchParams.get("calendar");
    const dotloop = searchParams.get("dotloop");
    const reason = searchParams.get("reason");
    if (calendar === "connected") {
      void load();
      showToast("Google Calendar connected.");
      router.replace("/dashboard/settings?tab=workspace", { scroll: false });
    } else if (calendar === "error") {
      const message =
        reason === "database_table_missing"
          ? "Calendar database not set up yet — we’re fixing this on our side."
          : reason === "access_denied"
            ? "Google access was denied. Try Connect again and click Allow."
            : reason === "missing_code_or_session"
              ? "Session expired — click Connect again (stay signed in to VoiceReach)."
              : `Google Calendar connection failed${reason ? `: ${reason}` : ""}.`;
      showToast(message, "error");
      router.replace("/dashboard/settings?tab=workspace", { scroll: false });
    } else if (dotloop === "connected") {
      void load();
      showToast("Dotloop connected.");
      router.replace("/dashboard/settings?tab=workspace", { scroll: false });
    } else if (dotloop === "error") {
      const message =
        reason === "database_table_missing"
          ? "Dotloop database not set up yet — run supabase/schema-integrations.sql."
          : reason === "access_denied"
            ? "Dotloop access was denied. Try Connect again and click Allow."
            : reason === "missing_code_or_session"
              ? "Session expired — click Connect again (stay signed in)."
              : `Dotloop connection failed${reason ? `: ${reason}` : ""}.`;
      showToast(message, "error");
      router.replace("/dashboard/settings?tab=workspace", { scroll: false });
    }
  }, [load, router, searchParams]);

  const headerQuery = useDashboardSearch();
  useEffect(() => {
    if (headerQuery) setSearch(headerQuery);
  }, [headerQuery]);

  useEffect(() => {
    if (!lastUpgradedAt || !settings) return;
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            billing: {
              ...sharedBilling,
              voiceMinutesUsed: prev.billing.voiceMinutesUsed,
            },
          }
        : prev,
    );
    setSavedSnapshot((snap) => {
      if (!snap) return snap;
      try {
        const parsed = JSON.parse(snap) as UserSettings;
        return JSON.stringify({
          ...parsed,
          billing: { ...sharedBilling, voiceMinutesUsed: parsed.billing.voiceMinutesUsed },
        });
      } catch {
        return snap;
      }
    });
  }, [lastUpgradedAt, sharedBilling]);

  const dirty = useMemo(
    () => settings !== null && JSON.stringify(settings) !== savedSnapshot,
    [settings, savedSnapshot],
  );

  const update = useCallback((patch: Partial<UserSettings> | ((s: UserSettings) => UserSettings)) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      if (user) {
        const parts = settings.profile.fullName.trim().split(/\s+/);
        await user.update({
          firstName: parts[0] ?? "",
          lastName: parts.slice(1).join(" ") || "",
        });
      }
      const data = await persistSettings(settings);
      setSettings(data.settings);
      setSavedSnapshot(JSON.stringify(data.settings));
      saveSettingsLocal(data.settings);
      setProfileEditing(false);
      showToast("All changes saved");
    } catch (e) {
      saveSettingsLocal(settings);
      showToast(
        e instanceof Error ? `${e.message} — saved on this device` : "Saved locally",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!savedSnapshot) return;
    setSettings(JSON.parse(savedSnapshot) as UserSettings);
    setProfileEditing(false);
    showToast("Changes discarded");
  };

  const avatarUrl =
    settings?.profile.avatarUrl || user?.imageUrl || settings?.team[0]?.avatarUrl;

  const connectedCount = settings?.integrations.filter((i) => i.connected).length ?? 0;

  const filteredTeam = useMemo(() => {
    if (!settings) return [];
    const q = search.trim().toLowerCase();
    return settings.team.filter(
      (m) =>
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role.includes(q),
    );
  }, [settings, search]);

  if (loading && !settings) {
    return (
      <div className="luxury-page mx-auto max-w-[1224px] p-8">
        <p className="text-center text-taupe">Loading settings…</p>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="luxury-page mx-auto w-full max-w-[1224px] space-y-6 p-8 pb-24">
      {toast ? (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-[150] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 shadow-card",
            toast.tone === "success" ? "border-emerald-muted/30 bg-ivory" : "border-error/30",
          )}
          role="status"
        >
          <Icon
            name={toast.tone === "success" ? "check_circle" : "error"}
            className={toast.tone === "success" ? "text-emerald-muted" : "text-error"}
          />
          <span className="text-[14px] text-ink">{toast.message}</span>
        </div>
      ) : null}

      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-taupe">Settings</p>
        <h1 className="font-serif text-[36px] font-semibold text-ink">Account & workspace</h1>
        <p className="mt-1 text-[15px] text-slate-text">
          Manage profile, team, integrations, API keys, and billing.
        </p>
        <div className="relative mt-4 max-w-md">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-taupe"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search settings, team, integrations…"
            className="h-10 w-full rounded-full border border-outline-variant/20 bg-champagne/50 pl-10 pr-4 text-[14px] outline-none"
          />
        </div>
      </header>

      <div className="flex gap-6 overflow-x-auto border-b border-outline-variant/20 whitespace-nowrap">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "pb-3 text-[14px] font-medium transition-colors",
              tab === t.id
                ? "border-b-2 border-rose-gold-deep text-ink"
                : "text-taupe hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {tab === "profile" ? (
            <LuxuryCard padding="lg">
              <div className="mb-6 flex items-start justify-between">
                <h2 className="font-serif text-[22px] font-semibold text-ink">Personal information</h2>
                <button
                  type="button"
                  onClick={() => setProfileEditing((e) => !e)}
                  className="rounded-full px-4 py-2 text-[13px] font-medium text-rose-gold-deep hover:bg-rose-gold/10"
                >
                  {profileEditing ? "Done editing" : "Edit profile"}
                </button>
              </div>
              <div className="mb-8 flex items-center gap-6">
                <div className="relative">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt="Profile"
                      width={96}
                      height={96}
                      className="h-24 w-24 rounded-full border-4 border-champagne object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-champagne text-ink">
                      <Icon name="person" className="text-[40px]" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!profileEditing}
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/30 bg-ivory shadow-sm disabled:opacity-50"
                    aria-label="Change photo"
                  >
                    <Icon name="photo_camera" className="text-[18px]" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = URL.createObjectURL(file);
                      update({
                        profile: { ...settings.profile, avatarUrl: url },
                      });
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-serif text-[20px] font-semibold text-ink">
                    {settings.profile.fullName}
                  </h3>
                  <p className="text-[14px] text-slate-text">{settings.profile.jobTitle}</p>
                  <p className="text-[13px] text-taupe">{email}</p>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    label: "Full name",
                    value: settings.profile.fullName,
                    onChange: (v: string) =>
                      update({ profile: { ...settings.profile, fullName: v } }),
                  },
                  {
                    label: "Email address",
                    value: email,
                    onChange: () => {},
                    readOnly: true,
                    hint: "Managed by your sign-in provider",
                  },
                  {
                    label: "Phone number",
                    value: settings.profile.phone,
                    onChange: (v: string) =>
                      update({ profile: { ...settings.profile, phone: v } }),
                  },
                  {
                    label: "Job title",
                    value: settings.profile.jobTitle,
                    onChange: (v: string) =>
                      update({ profile: { ...settings.profile, jobTitle: v } }),
                  },
                ].map((field) => (
                  <div key={field.label} className="space-y-2">
                    <label className="text-[13px] font-medium text-taupe">{field.label}</label>
                    <input
                      className="h-12 w-full rounded-full border border-outline-variant/25 bg-ivory px-5 text-[14px] outline-none focus:border-rose-gold-deep/40 disabled:bg-champagne/50"
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      readOnly={field.readOnly || !profileEditing}
                      disabled={field.readOnly}
                    />
                    {"hint" in field && field.hint ? (
                      <p className="text-[12px] text-taupe">{field.hint}</p>
                    ) : null}
                  </div>
                ))}
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-taupe">Timezone</label>
                  <select
                    className="h-12 w-full rounded-full border border-outline-variant/25 bg-ivory px-5 text-[14px] outline-none disabled:bg-champagne/50"
                    value={settings.profile.timezone}
                    onChange={(e) =>
                      update({ profile: { ...settings.profile, timezone: e.target.value } })
                    }
                    disabled={!profileEditing}
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </LuxuryCard>
          ) : null}

          {tab === "workspace" ? (
            <>
              <LuxuryCard padding="lg">
                <h2 className="mb-6 font-serif text-[22px] font-semibold text-ink">Workspace</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-taupe">Workspace name</label>
                    <input
                      className="h-12 w-full rounded-full border border-outline-variant/25 bg-ivory px-5 text-[14px]"
                      value={settings.workspace.name}
                      onChange={(e) =>
                        update({ workspace: { ...settings.workspace, name: e.target.value } })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-taupe">URL slug</label>
                    <input
                      className="h-12 w-full rounded-full border border-outline-variant/25 bg-ivory px-5 text-[14px]"
                      value={settings.workspace.slug}
                      onChange={(e) =>
                        update({
                          workspace: {
                            ...settings.workspace,
                            slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-taupe">Industry</label>
                    <input
                      className="h-12 w-full rounded-full border border-outline-variant/25 bg-ivory px-5 text-[14px]"
                      value={settings.workspace.industry}
                      onChange={(e) =>
                        update({ workspace: { ...settings.workspace, industry: e.target.value } })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-taupe">Default sender name</label>
                    <input
                      className="h-12 w-full rounded-full border border-outline-variant/25 bg-ivory px-5 text-[14px]"
                      value={settings.workspace.defaultSenderName}
                      onChange={(e) =>
                        update({
                          workspace: { ...settings.workspace, defaultSenderName: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
              </LuxuryCard>

              <LuxuryCard padding="lg">
                <h2 className="mb-2 font-serif text-[22px] font-semibold text-ink">
                  Compliance defaults
                </h2>
                <p className="mb-6 text-[14px] text-slate-text">
                  TCPA quiet hours and consent requirements for outbound campaigns.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-taupe">Quiet hours start</label>
                    <input
                      type="time"
                      className="h-12 w-full rounded-full border border-outline-variant/25 bg-ivory px-5 text-[14px]"
                      value={settings.workspace.quietHoursStart}
                      onChange={(e) =>
                        update({
                          workspace: { ...settings.workspace, quietHoursStart: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-taupe">Quiet hours end</label>
                    <input
                      type="time"
                      className="h-12 w-full rounded-full border border-outline-variant/25 bg-ivory px-5 text-[14px]"
                      value={settings.workspace.quietHoursEnd}
                      onChange={(e) =>
                        update({
                          workspace: { ...settings.workspace, quietHoursEnd: e.target.value },
                        })
                      }
                    />
                  </div>
                </div>
                <label className="mt-4 flex cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.workspace.requireConsentProof}
                    onChange={(e) =>
                      update({
                        workspace: {
                          ...settings.workspace,
                          requireConsentProof: e.target.checked,
                        },
                      })
                    }
                    className="rounded border-outline-variant"
                  />
                  <span className="text-[14px] text-ink">Require consent proof before sending</span>
                </label>
                <Link
                  href="/dashboard/contacts"
                  className="mt-4 inline-flex items-center gap-1 text-[14px] font-medium text-rose-gold-deep hover:underline"
                >
                  Review contact consent <Icon name="arrow_forward" className="text-[16px]" />
                </Link>
              </LuxuryCard>

              <LuxuryCard padding="lg">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="font-serif text-[22px] font-semibold text-ink">API integrations</h2>
                  <span className="text-[13px] text-taupe">{connectedCount} connected</span>
                </div>
                <InAppBrowserBanner context="google-calendar" />
                <div className="space-y-3">
                  {settings.integrations
                    .filter(
                      (i) =>
                        !search.trim() ||
                        i.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((integration) => (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between rounded-xl border border-outline-variant/15 bg-champagne/30 p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ivory text-rose-gold-deep">
                            <Icon name={integration.icon} />
                          </div>
                          <div>
                            <p className="font-medium text-ink">{integration.name}</p>
                            <p className="flex items-center gap-2 text-[12px] text-taupe">
                              <span
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  integration.connected ? "bg-emerald-muted" : "bg-taupe/40",
                                )}
                              />
                              {integration.connected ? "Connected" : "Not connected"}
                              {integration.lastSync
                                ? ` · ${formatRelativeTime(integration.lastSync)}`
                                : ""}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (integration.id === "google-calendar" && !integration.connected) {
                              const result = connectGoogleCalendar();
                              if (result.blocked) {
                                showToast(
                                  "Open VoiceReach in Safari or Chrome, then connect Google Calendar.",
                                  "error",
                                );
                              }
                              return;
                            }
                            if (integration.id === "google-calendar" && integration.connected) {
                              void (async () => {
                                const res = await fetch("/api/integrations/google/status", {
                                  method: "DELETE",
                                });
                                if (res.ok) {
                                  setSettings((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          integrations: prev.integrations.map((item) =>
                                            item.id === "google-calendar"
                                              ? {
                                                  ...item,
                                                  connected: false,
                                                  accountLabel: undefined,
                                                  lastSync: undefined,
                                                }
                                              : item,
                                          ),
                                        }
                                      : prev,
                                  );
                                  showToast("Google Calendar disconnected.");
                                } else {
                                  showToast("Could not disconnect Google Calendar.", "error");
                                }
                              })();
                              return;
                            }
                            if (integration.id === "dotloop" && !integration.connected) {
                              const result = connectDotloop();
                              if (result.blocked) {
                                showToast(
                                  "Open ARI in Safari or Chrome, then connect Dotloop.",
                                  "error",
                                );
                              }
                              return;
                            }
                            if (integration.id === "dotloop" && integration.connected) {
                              void (async () => {
                                const res = await fetch("/api/integrations/dotloop/status", {
                                  method: "DELETE",
                                });
                                if (res.ok) {
                                  setSettings((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          integrations: prev.integrations.map((item) =>
                                            item.id === "dotloop"
                                              ? {
                                                  ...item,
                                                  connected: false,
                                                  accountLabel: undefined,
                                                  lastSync: undefined,
                                                }
                                              : item,
                                          ),
                                        }
                                      : prev,
                                  );
                                  showToast("Dotloop disconnected.");
                                } else {
                                  showToast("Could not disconnect Dotloop.", "error");
                                }
                              })();
                              return;
                            }
                            if (integration.id === "claude") {
                              showToast(
                                integration.connected
                                  ? "Claude is live. Open AI Assist to generate emails, SMS, and scripts."
                                  : "Add ANTHROPIC_API_KEY in Vercel to turn on live Claude drafts.",
                                integration.connected ? "success" : "error",
                              );
                              return;
                            }
                            setIntegrationModal(integration);
                          }}
                          className={cn(
                            "rounded-full px-5 py-2 text-[13px] font-medium transition-colors",
                            integration.connected
                              ? "border border-outline-variant/30 text-ink hover:bg-ivory"
                              : "bg-rose-gold text-ivory hover:opacity-95",
                          )}
                        >
                          {integration.id === "google-calendar" && integration.connected
                            ? "Disconnect"
                            : integration.id === "dotloop" && integration.connected
                              ? "Disconnect"
                              : integration.id === "claude" && integration.connected
                                ? "Live"
                                : integration.connected
                                  ? "Configure"
                                  : "Connect"}
                        </button>
                      </div>
                    ))}
                </div>
              </LuxuryCard>

              <LuxuryCard padding="lg">
                <h2 className="mb-4 font-serif text-[22px] font-semibold text-ink">Notifications</h2>
                {(
                  [
                    { key: "emailDigest" as const, label: "Weekly email digest" },
                    { key: "smsAlerts" as const, label: "SMS delivery alerts" },
                    { key: "loginAlerts" as const, label: "Login alerts" },
                  ] as const
                ).map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center justify-between border-b border-outline-variant/10 py-3 last:border-0"
                  >
                    <span className="text-[14px] text-ink">{item.label}</span>
                    <input
                      type="checkbox"
                      checked={settings.notifications[item.key]}
                      onChange={(e) =>
                        update({
                          notifications: {
                            ...settings.notifications,
                            [item.key]: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-outline-variant"
                    />
                  </label>
                ))}
              </LuxuryCard>
            </>
          ) : null}

          {tab === "api" ? (
            <LuxuryCard padding="lg">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-serif text-[22px] font-semibold text-ink">API keys</h2>
                  <p className="text-[14px] text-slate-text">
                    Authenticate server requests to VoiceReach APIs.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCreatedApiKey(null);
                    setApiKeyOpen(true);
                  }}
                  className="flex items-center gap-2 rounded-full bg-rose-gold px-5 py-2.5 text-[14px] font-medium text-ivory"
                >
                  <Icon name="add" />
                  Create key
                </button>
              </div>
              <div className="space-y-3">
                {settings.apiKeys.length === 0 ? (
                  <p className="py-8 text-center text-taupe">No API keys yet.</p>
                ) : (
                  settings.apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/15 bg-champagne/30 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-ink">{key.label}</p>
                        <p className="font-mono text-[12px] text-taupe">{key.prefix}••••••••</p>
                        <p className="text-[11px] text-taupe">
                          Created {formatRelativeTime(key.createdAt)}
                          {key.lastUsed ? ` · Used ${formatRelativeTime(key.lastUsed)}` : ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Revoke "${key.label}"?`)) {
                            update({
                              apiKeys: settings.apiKeys.filter((k) => k.id !== key.id),
                            });
                            showToast("API key revoked");
                          }
                        }}
                        className="text-[13px] font-medium text-error hover:underline"
                      >
                        Revoke
                      </button>
                    </div>
                  ))
                )}
              </div>
            </LuxuryCard>
          ) : null}

          {tab === "team" ? (
            <LuxuryCard padding="lg">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-serif text-[22px] font-semibold text-ink">Team management</h2>
                  <p className="text-[14px] text-slate-text">
                    Roles, permissions, and member status for {settings.workspace.name}.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInviteOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-rose-gold px-6 py-2.5 text-[14px] font-medium text-ivory"
                >
                  <Icon name="add" />
                  Invite member
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant/15 text-[11px] font-semibold uppercase tracking-wider text-taupe">
                      <th className="pb-3 pr-4">User</th>
                      <th className="pb-3 pr-4">Role</th>
                      <th className="pb-3 pr-4">Status</th>
                      <th className="pb-3 pr-4">Last active</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {filteredTeam.map((member) => (
                      <tr key={member.id} className="hover:bg-champagne/30">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            {member.avatarUrl ? (
                              <Image
                                src={member.avatarUrl}
                                alt=""
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-champagne">
                                <Icon name="person" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-ink">{member.name}</p>
                              <p className="text-[12px] text-taupe">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-[14px] text-slate-text">
                          {ROLE_LABELS[member.role]}
                        </td>
                        <td className="py-4 pr-4">
                          <span
                            className={cn(
                              "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase",
                              member.status === "active" && "bg-sage-light text-emerald-muted",
                              member.status === "pending" && "bg-champagne text-bronze",
                              member.status === "inactive" && "bg-champagne text-taupe",
                            )}
                          >
                            {member.status}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-[14px] text-taupe">
                          {member.lastActive
                            ? formatRelativeTime(member.lastActive)
                            : member.status === "pending"
                              ? "—"
                              : "—"}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setTeamMemberModal(member)}
                            className="rounded-full p-2 text-taupe hover:bg-champagne hover:text-ink"
                            aria-label={`Manage ${member.name}`}
                          >
                            <Icon name="more_vert" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </LuxuryCard>
          ) : null}

          {tab === "billing" ? (
            <LuxuryCard padding="lg">
              <h2 className="mb-6 font-serif text-[22px] font-semibold text-ink">Billing & usage</h2>
              <div className="mb-6 rounded-2xl border border-outline-variant/15 bg-champagne/40 p-6">
                <p className="font-serif text-[24px] font-semibold text-ink">
                  {settings.billing.subscriptionStatus === "active"
                    ? settings.billing.planName
                    : "No active plan"}
                </p>
                <p className="text-[15px] text-slate-text">
                  {settings.billing.subscriptionStatus === "active"
                    ? `$${settings.billing.monthlyPrice.toFixed(2)} / month`
                    : "Pay with Stripe to unlock your workspace"}
                </p>
                {planUsage ? (
                  <ul className="mt-4 space-y-3 text-[13px] text-slate-text">
                    <li className="flex justify-between gap-3">
                      <span>Contacts</span>
                      <span className="font-medium text-ink">
                        {planUsage.contactsUsed.toLocaleString()}
                        {planUsage.contactsLimit == null
                          ? " / Unlimited"
                          : ` / ${planUsage.contactsLimit.toLocaleString()}`}
                      </span>
                    </li>
                    <li className="flex justify-between gap-3">
                      <span>SMS this month</span>
                      <span className="font-medium text-ink">
                        {planUsage.smsUsed.toLocaleString()}
                        {planUsage.smsIncluded > 0
                          ? ` / ${planUsage.smsIncluded.toLocaleString()} included`
                          : " · $0.03 / SMS"}
                      </span>
                    </li>
                    <li className="flex justify-between gap-3">
                      <span>Ringless (RVM) this month</span>
                      <span className="font-medium text-ink">
                        {planUsage.rvmUsed.toLocaleString()}
                        {planUsage.rvmIncluded > 0
                          ? ` / ${planUsage.rvmIncluded.toLocaleString()} included`
                          : " · $0.10 / drop"}
                      </span>
                    </li>
                    <li className="flex justify-between gap-3">
                      <span>Email this month</span>
                      <span className="font-medium text-ink">
                        {planUsage.emailUsed.toLocaleString()} /{" "}
                        {planUsage.emailIncluded.toLocaleString()} included
                      </span>
                    </li>
                    {(planUsage.paygEstimatedCents ?? 0) > 0 ? (
                      <li className="flex justify-between gap-3 border-t border-outline-variant/20 pt-3">
                        <span>PAYG charges this month</span>
                        <span className="font-medium text-ink">
                          ${((planUsage.paygEstimatedCents ?? 0) / 100).toFixed(2)}
                          <span className="block text-right text-[11px] font-normal text-taupe">
                            billed on next Stripe invoice
                          </span>
                        </span>
                      </li>
                    ) : null}
                  </ul>
                ) : (
                  <p className="mt-4 text-[13px] text-taupe">Usage loads with your plan limits.</p>
                )}
                <button
                  type="button"
                  onClick={openUpgrade}
                  className="mt-4 rounded-full bg-rose-gold px-6 py-2.5 text-[14px] font-medium text-ivory"
                >
                  {settings.billing.subscriptionStatus === "active"
                    ? "Change plan"
                    : "Choose a plan & pay"}
                </button>
                {settings.billing.subscriptionStatus === "active" || subscriptionActive ? (
                  <button
                    type="button"
                    disabled={portalLoading}
                    onClick={() => {
                      setPortalLoading(true);
                      void (async () => {
                        try {
                          const res = await fetch("/api/billing/portal", { method: "POST" });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            throw new Error(
                              (data as { error?: string }).error ??
                                "Could not open billing portal",
                            );
                          }
                          const url = (data as { url?: string }).url;
                          if (!url) throw new Error("Portal URL missing");
                          window.location.assign(url);
                        } catch (e) {
                          setToast({
                            message:
                              e instanceof Error
                                ? e.message
                                : "Could not open Stripe billing portal",
                            tone: "error",
                          });
                          window.setTimeout(() => setToast(null), 6000);
                          setPortalLoading(false);
                        }
                      })();
                    }}
                    className="ml-3 mt-4 rounded-full border border-outline-variant/40 bg-ivory px-6 py-2.5 text-[14px] font-medium text-ink"
                  >
                    {portalLoading ? "Opening…" : "Manage / cancel subscription"}
                  </button>
                ) : null}
                <p className="mt-3 text-[12px] text-taupe">
                  Starter pay-as-you-go: ARI tracks each live SMS ($0.03) and RVM ($0.10) and adds
                  them to your next Stripe invoice automatically. Growth/Pro use included monthly
                  allotments first.
                </p>
              </div>
              <p className="text-[14px] text-slate-text">
                Each tier has its own contact and send limits. Higher tiers keep everything below and
                raise the caps. View detailed metrics in{" "}
                <Link href="/dashboard/analytics" className="text-rose-gold-deep hover:underline">
                  Analytics
                </Link>
                .
              </p>
            </LuxuryCard>
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-4">
          <LuxuryCard padding="lg">
            <h3 className="mb-4 font-serif text-[20px] font-semibold text-ink">Workspace team</h3>
            <div className="mb-4 flex -space-x-3">
              {settings.team.slice(0, 3).map((m) =>
                m.avatarUrl ? (
                  <Image
                    key={m.id}
                    src={m.avatarUrl}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full border-2 border-ivory object-cover"
                  />
                ) : (
                  <div
                    key={m.id}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ivory bg-champagne text-[12px]"
                  >
                    {m.name[0]}
                  </div>
                ),
              )}
              {settings.team.length > 3 ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ivory bg-champagne text-[12px] font-medium">
                  +{settings.team.length - 3}
                </div>
              ) : null}
            </div>
            <p className="mb-4 text-[14px] text-slate-text">
              {settings.team.filter((m) => m.status === "active").length} active members in{" "}
              <strong>{settings.workspace.name}</strong>.
            </p>
            <button
              type="button"
              onClick={() => {
                setTab("team");
                setInviteOpen(true);
              }}
              className="w-full rounded-full border border-outline-variant/30 py-3 text-[14px] font-medium text-ink hover:bg-champagne"
            >
              Manage team
            </button>
          </LuxuryCard>

          <LuxuryCard padding="lg" className="bg-ink text-ivory">
            <div className="mb-4 flex items-center gap-3">
              <Icon name="verified_user" className="text-[24px] text-rose-gold" />
              <h3 className="font-serif text-[20px] font-semibold">Security</h3>
            </div>
            <ul className="space-y-4 text-[14px]">
              <li className="flex items-center justify-between">
                <span>Two-factor auth</span>
                <button
                  type="button"
                  onClick={() =>
                    update({
                      security: {
                        ...settings.security,
                        twoFactorEnabled: !settings.security.twoFactorEnabled,
                      },
                    })
                  }
                  className={cn(
                    "rounded-full px-3 py-1 text-[11px] font-bold uppercase",
                    settings.security.twoFactorEnabled
                      ? "bg-sage text-ivory"
                      : "bg-champagne/20 text-champagne",
                  )}
                >
                  {settings.security.twoFactorEnabled ? "Enabled" : "Off"}
                </button>
              </li>
              <li className="flex items-center justify-between">
                <span>Login alerts</span>
                <span className="rounded-full bg-sage/80 px-3 py-1 text-[11px] font-bold uppercase">
                  {settings.notifications.loginAlerts ? "Active" : "Off"}
                </span>
              </li>
              <li className="flex items-center justify-between text-taupe">
                <span>Last login</span>
                <span className="text-[13px]">
                  {user?.lastSignInAt
                    ? formatRelativeTime(new Date(user.lastSignInAt).toISOString())
                    : "Just now"}
                </span>
              </li>
            </ul>
            <Link
              href="/dashboard/activity"
              className="mt-4 inline-block text-[13px] text-rose-gold hover:underline"
            >
              View security activity →
            </Link>
          </LuxuryCard>

          <LuxuryCard padding="lg">
            <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-widest text-taupe">
              Plan details
            </h3>
            <p className="font-serif text-[20px] font-semibold text-ink">
              {settings.billing.subscriptionStatus === "active"
                ? settings.billing.planName
                : "No active plan"}
            </p>
            <p className="text-[14px] text-slate-text">
              {settings.billing.subscriptionStatus === "active"
                ? `$${settings.billing.monthlyPrice} / month`
                : "Complete Stripe checkout to activate"}
            </p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-champagne">
              <div
                className="h-full bg-sage"
                style={{
                  width: `${Math.min(100, (settings.billing.voiceMinutesUsed / settings.billing.voiceMinutesLimit) * 100)}%`,
                }}
              />
            </div>
            <p className="mt-2 text-[12px] text-taupe">
              {settings.billing.voiceMinutesUsed.toLocaleString()} /{" "}
              {settings.billing.voiceMinutesLimit.toLocaleString()} minutes
            </p>
            <button
              type="button"
              onClick={openUpgrade}
              className="mt-4 w-full rounded-full bg-rose-gold py-3 text-[14px] font-medium text-ivory"
            >
              {subscriptionActive ? "Change plan" : "Choose a plan & pay"}
            </button>
          </LuxuryCard>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-end gap-3 border-t border-outline-variant/15 bg-ivory/95 px-4 py-4 backdrop-blur-md lg:left-64">
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!dirty || saving}
          className="rounded-full px-6 py-3 text-[14px] font-medium text-taupe hover:text-ink disabled:opacity-40"
        >
          Discard changes
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="rounded-full bg-rose-gold px-8 py-3 text-[14px] font-medium text-ivory shadow-sm hover:opacity-95 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save all changes"}
        </button>
      </div>

      <IntegrationConfigModal
        integration={integrationModal}
        open={!!integrationModal}
        onClose={() => setIntegrationModal(null)}
        onSave={(integration) => {
          update({
            integrations: settings.integrations.map((i) =>
              i.id === integration.id ? integration : i,
            ),
          });
          showToast(`${integration.name} ${integration.connected ? "connected" : "disconnected"}`);
        }}
      />

      <InviteMemberModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvite={(member) => {
          update({ team: [...settings.team, member] });
          showToast(`Invitation sent to ${member.email}`);
        }}
      />

      <ApiKeyModal
        open={apiKeyOpen}
        onClose={() => {
          setApiKeyOpen(false);
          setCreatedApiKey(null);
        }}
        createdKey={createdApiKey}
        onCreate={(label) => {
          const { fullKey, record } = generateApiKey();
          record.label = label;
          update({ apiKeys: [...settings.apiKeys, record] });
          setCreatedApiKey(fullKey);
          showToast("API key created — copy it now");
        }}
      />

      <TeamMemberModal
        member={teamMemberModal}
        open={!!teamMemberModal}
        onClose={() => setTeamMemberModal(null)}
        onUpdate={(member) => {
          update({
            team: settings.team.map((m) => (m.id === member.id ? member : m)),
          });
          setTeamMemberModal(member);
          showToast("Member updated");
        }}
        onRemove={(id) => {
          update({ team: settings.team.filter((m) => m.id !== id) });
          showToast("Member removed");
        }}
        onResendInvite={(member) => {
          showToast(`Invitation resent to ${member.email}`);
        }}
      />
    </div>
  );
}
