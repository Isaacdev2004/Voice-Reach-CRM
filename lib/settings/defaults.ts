import { PLAN_OPTIONS } from "@/lib/billing/plans";
import type { UserSettings } from "./types";

export { PLAN_OPTIONS };

export const DEFAULT_SETTINGS: UserSettings = {
  profile: {
    fullName: "Marcus Sterling",
    phone: "+1 (555) 000-1234",
    timezone: "America/New_York",
    jobTitle: "Senior CRM Administrator",
  },
  workspace: {
    name: "Enterprise CRM",
    slug: "enterprise-crm",
    industry: "Real Estate",
    defaultSenderName: "VoiceReach Team",
    quietHoursStart: "21:00",
    quietHoursEnd: "08:00",
    requireConsentProof: true,
  },
  integrations: [
    {
      id: "twilio",
      name: "Twilio",
      icon: "call",
      connected: true,
      accountLabel: "AC••••4821",
      secretHint: "••••••••",
      lastSync: new Date().toISOString(),
    },
    {
      id: "sendgrid",
      name: "SendGrid",
      icon: "mail",
      connected: true,
      accountLabel: "apikey",
      secretHint: "••••••••",
      lastSync: new Date().toISOString(),
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
  apiKeys: [
    {
      id: "key-default",
      label: "Production CRM",
      prefix: "vr_live_a8f2",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
  team: [
    {
      id: "tm-owner",
      name: "Marcus Sterling",
      email: "marcus.s@voicereach.io",
      role: "owner",
      status: "active",
      lastActive: new Date().toISOString(),
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCm3S3egIq2IOQ_Kf9MFaN3lJpE7bAZzTu_WU2IyH12ovexfXNMT91goGMB42UA2zlfdXzJbk08bVNQKjl3gGxFhvkmDk08ZJnudZZjbYbH7v8Ve8siqxBc5rfV7zjno69MQx9dE7VPAxCPUtOfeNabIosI0AQO6xZNpW1tm_LtoJyyGFvkqtMwqOh-3WSAdgJadkVtriMpPSzWNagT9m5wK6fWUkwTH2A6OLV8I-3u03BqC0bvGJaiYDhdJJMZQZyYQi_FF-Im6V03",
    },
    {
      id: "tm-2",
      name: "Elena Rodriguez",
      email: "elena.r@voicereach.io",
      role: "admin",
      status: "active",
      lastActive: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD9W1fAXkSeb-CXdYlvOYf-5nZozM299kEuePxfTVQUEn3M8mvBB_qiOo2yGV5kTkY5QaZylhv2JN3JsIkw4mgHFjyRn--85JkpaLTl4LLnLYGxZNKefU7p6LHQ_lGcMsrhoAOhWqSeuuBq1E8NsdG9zbPpaCqNwILjggLDsfZ2Q59fF6byykUX_20GbjK15wkS_kD_I_q8X498taxddImIZXNRdP0CvgYKA33z136-9V12ZxI3hltLjvl0DeLqWKqvRv3X1fsJGmBg",
    },
    {
      id: "tm-3",
      name: "James Wilson",
      email: "j.wilson@voicereach.io",
      role: "billing",
      status: "active",
      lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      avatarUrl:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDP0pISUobue9AnFV0pRfxRpXPfGTNNIHpUaB0yYbuQ3m9sSodzN7BYORKaMAn5WisVyAuN54Utn1FhXhlLPoGSnlnytIyn8p-sJpcAL1aFbA-RBHOvokU-TIV9BtO6aMFygWxNqH2930RshKv5OvI9U8Jx9gg4iPwW5JNCjUF8mN6rada6XMCjFVPQ1XhUbDZm4PjdVzqvqjpiDNoXrP5y7KHPLBjJsWHZbxYX7t_vQtxlIB4CVaP6BTw2uIBzFKZzWRmYLgTJ9KYD",
    },
    {
      id: "tm-4",
      name: "Sarah Chen",
      email: "sarah.c@voicereach.io",
      role: "user",
      status: "pending",
    },
  ],
  billing: {
    planId: "growth",
    planName: "Growth",
    monthlyPrice: 99,
    voiceMinutesLimit: 250,
    voiceMinutesUsed: 0,
    subscriptionStatus: "active",
  },
  notifications: {
    emailDigest: true,
    smsAlerts: true,
    loginAlerts: true,
  },
  security: {
    twoFactorEnabled: true,
  },
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
