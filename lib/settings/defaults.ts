import { PLAN_OPTIONS } from "@/lib/billing/plans";
import type { UserSettings } from "./types";

export { PLAN_OPTIONS };

export const DEFAULT_SETTINGS: UserSettings = {
  profile: {
    fullName: "",
    phone: "",
    timezone: "America/New_York",
    jobTitle: "",
  },
  workspace: {
    name: "My workspace",
    slug: "my-workspace",
    industry: "Real Estate",
    defaultSenderName: "",
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
    requireConsentProof: true,
  },
  integrations: [
    {
      id: "twilio",
      name: "Twilio (SMS)",
      icon: "call",
      connected: false,
    },
    {
      id: "resend",
      name: "Resend (Email)",
      icon: "mail",
      connected: false,
    },
    {
      id: "slybroadcast",
      name: "Slybroadcast (Voicemail)",
      icon: "voicemail",
      connected: false,
    },
    {
      id: "slack",
      name: "Slack Notifications",
      icon: "chat",
      connected: false,
    },
    {
      id: "google-calendar",
      name: "Google Calendar",
      icon: "calendar_today",
      connected: false,
    },
    {
      id: "claude",
      name: "Claude (Anthropic)",
      icon: "auto_awesome",
      connected: false,
    },
    {
      id: "dotloop",
      name: "Dotloop",
      icon: "folder_shared",
      connected: false,
    },
  ],
  apiKeys: [],
  team: [],
  billing: {
    planId: "growth",
    planName: "Choose a plan",
    monthlyPrice: 0,
    voiceMinutesLimit: 0,
    voiceMinutesUsed: 0,
    subscriptionStatus: "none",
  },
  notifications: {
    emailDigest: true,
    smsAlerts: true,
    loginAlerts: true,
  },
  security: {
    twoFactorEnabled: false,
  },
  contactCategories: ["Residential", "Commercial"],
  updatedAt: new Date().toISOString(),
};

export const TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
  { value: "Europe/Paris", label: "Central European Time (CET)" },
];
