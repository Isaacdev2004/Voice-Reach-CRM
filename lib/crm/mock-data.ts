import type {
  ActivityFeedItem,
  AiSuggestion,
  CampaignDefinition,
  ContactProfile,
  DashboardKpi,
} from "./types";
import { contactSegment, segmentLabel } from "@/lib/contacts/lifecycle";

export const DEFAULT_CAMPAIGN: CampaignDefinition = {
  id: "luxury-seller-follow-up",
  name: "Luxury Seller – Automated Follow Up",
  description:
    "A multi-touch automated sequence that nurtures leads and keeps you top of mind.",
  audience: "Luxury Home Sellers",
  durationDays: 10,
  goals: [
    "Increase response rate",
    "Convert leads into luxury listings",
    "Maintain warm, personalized touchpoints",
  ],
  stats: { reach: 1247, replies: 312, responseRate: 24.9 },
  steps: [
    {
      id: "s1",
      order: 1,
      type: "voicemail",
      title: "Ringless Voicemail",
      description: "Warm introduction with your recorded voice message.",
      dayLabel: "Day 1",
      timeLabel: "9:00 AM",
      status: "sent",
    },
    {
      id: "s2",
      order: 2,
      type: "avatar_video",
      title: "Personalized Video Message",
      description: "AI avatar delivers a tailored message on your behalf.",
      dayLabel: "Day 2",
      timeLabel: "11:00 AM",
      status: "sent",
    },
    {
      id: "s3",
      order: 3,
      type: "email",
      title: "Email",
      description: "Beautifully designed, personalized email follow-up.",
      dayLabel: "Day 3",
      timeLabel: "1:00 PM",
      status: "sent",
    },
    {
      id: "s4",
      order: 4,
      type: "sms",
      title: "Text Message",
      description: "Concise, high-touch SMS check-in.",
      dayLabel: "Day 5",
      timeLabel: "10:00 AM",
      status: "sent",
    },
    {
      id: "s5",
      order: 5,
      type: "retargeting",
      title: "Social Media Retargeting",
      description: "Stay visible with co-branded social touchpoints.",
      dayLabel: "Day 7",
      timeLabel: "All Day",
      status: "active",
    },
    {
      id: "s6",
      order: 6,
      type: "callback",
      title: "Callback Alert",
      description: "Reminder to personally follow up when engagement peaks.",
      dayLabel: "Day 10",
      timeLabel: "9:00 AM",
      status: "pending",
    },
  ],
};

export const DEMO_CONTACT: ContactProfile = {
  id: "demo-elena-reyes",
  firstName: "Elena",
  lastName: "Reyes",
  title: "Physician & Business Owner",
  email: "elena.reyes@example.com",
  phone: "+1 (626) 555-0142",
  location: "Pasadena, CA",
  company: "Reyes Wellness Group",
  quote:
    "I value trust, discretion, and working with someone who truly understands my goals.",
  tags: ["Residential Agent", "Lender Partner", "Business Owner"],
  leadStatus: "Warm — Engaged",
  relationshipScore: 82,
  enrolledCampaigns: ["Luxury Seller – Automated Follow Up"],
  notes:
    "Relocating within 6 months. Needs home office space and quiet neighborhood. Prefers morning calls.",
  details: [
    { label: "Birthday", value: "March 14" },
    { label: "Spouse", value: "Marcus Reyes" },
    { label: "Children", value: "2" },
    { label: "Source", value: "Referral — Lender Partner" },
  ],
  timeline: [
    {
      id: "t1",
      type: "callback",
      title: "Called Back",
      description: "Returned your voicemail within 2 hours.",
      date: "May 20, 2026",
      actor: "You",
    },
    {
      id: "t2",
      type: "email",
      title: "Sent Market Update",
      description: "Luxury listing digest — opened twice.",
      date: "May 18, 2026",
      actor: "You",
    },
    {
      id: "t3",
      type: "email",
      title: "Clicked Email",
      description: "Viewed Pasadena estates collection.",
      date: "May 16, 2026",
      actor: "Elena Reyes",
    },
    {
      id: "t4",
      type: "voicemail",
      title: "Listened",
      description: "Listened to 94% of your ringless voicemail.",
      date: "May 14, 2026",
      actor: "Elena Reyes",
    },
    {
      id: "t5",
      type: "connection",
      title: "First Connection",
      description: "Introduced at wellness networking event.",
      date: "May 1, 2026",
      actor: "You",
    },
  ],
  signals: [
    {
      id: "sig1",
      label: "Listened",
      description: "Voicemail — 94% completion",
      date: "May 14",
      icon: "headphones",
    },
    {
      id: "sig2",
      label: "Clicked",
      description: "Listing email — Pasadena estates",
      date: "May 16",
      icon: "mail",
    },
    {
      id: "sig3",
      label: "Called Back",
      description: "Returned call within 2 hours",
      date: "May 20",
      icon: "phone_callback",
    },
  ],
  tasks: [
    {
      id: "task1",
      title: "Follow up on home search criteria",
      dueDate: "May 24, 2026",
      completed: false,
    },
    {
      id: "task2",
      title: "Schedule property tour — quiet neighborhood",
      dueDate: "May 28, 2026",
      completed: false,
    },
    {
      id: "task3",
      title: "Send lender introduction packet",
      dueDate: "May 22, 2026",
      completed: true,
    },
  ],
  aiSuggestions: [
    {
      id: "ai1",
      title: "Send personalized video",
      description:
        "Elena listened to your voicemail — a warm avatar message could deepen trust.",
      priority: "high",
      actionLabel: "Draft with AI",
    },
    {
      id: "ai2",
      title: "Schedule callback window",
      description: "She typically responds in the morning. Suggest Tuesday 9 AM.",
      priority: "medium",
      actionLabel: "Add reminder",
    },
  ],
};

export const DASHBOARD_KPIS: DashboardKpi[] = [
  { id: "k1", label: "Contacts", value: "1,247", change: "+8%", icon: "group", tone: "default" },
  { id: "k2", label: "Active Campaigns", value: "12", change: "+2", icon: "campaign", tone: "bronze" },
  { id: "k3", label: "Delivery Rate", value: "94.2%", change: "+1.2%", icon: "send", tone: "sage" },
  { id: "k4", label: "Callbacks", value: "48", change: "This week", icon: "phone_callback", tone: "rose" },
  { id: "k5", label: "Engagement Rate", value: "24.9%", change: "+3.1%", icon: "trending_up", tone: "sage" },
];

export const DASHBOARD_ACTIVITY: ActivityFeedItem[] = [
  {
    id: "a1",
    type: "voicemail",
    contactName: "Marcus Chen",
    description: "Listened to your ringless voicemail (87%)",
    time: "12 min ago",
  },
  {
    id: "a2",
    type: "email",
    contactName: "Sofia Alvarez",
    description: "Clicked your market update email",
    time: "34 min ago",
  },
  {
    id: "a3",
    type: "sms",
    contactName: "James Whitfield",
    description: "Replied: “Yes, let’s talk Thursday”",
    time: "1 hr ago",
  },
  {
    id: "a4",
    type: "callback",
    contactName: "Elena Reyes",
    description: "Returned your call — 4 min conversation",
    time: "2 hrs ago",
  },
];

export const DASHBOARD_AI_SUGGESTIONS: AiSuggestion[] = [
  {
    id: "dash-ai1",
    title: "3 follow-ups recommended",
    description: "Warm leads who engaged but haven’t heard from you in 5+ days.",
    priority: "high",
    actionLabel: "Review leads",
    actionHref: "/dashboard/contacts",
  },
  {
    id: "dash-ai2",
    title: "2 leads getting cold",
    description: "No opens or listens in the last 14 days — re-engage gently.",
    priority: "medium",
    actionLabel: "View contacts",
    actionHref: "/dashboard/contacts",
  },
  {
    id: "dash-ai3",
    title: "1 campaign underperforming",
    description: "“Q2 Seller Nurture” is 8% below your average response rate.",
    priority: "low",
    actionLabel: "Open campaign",
    actionHref: "/dashboard/campaigns",
  },
];

export function contactProfileFromApi(contact: {
  id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string;
  notes?: string | null;
  type?: string | null;
  source?: string | null;
}): ContactProfile {
  const typeLabel = contact.type?.trim() || "Contact";
  const segment = contactSegment(contact.type);

  return {
    id: contact.id,
    firstName: contact.first_name,
    lastName: contact.last_name ?? "",
    title: typeLabel,
    email: contact.email ?? undefined,
    phone: contact.phone,
    notes: contact.notes ?? "",
    tags: typeLabel !== "Contact" ? [typeLabel] : [],
    leadStatus: segmentLabel(segment),
    relationshipScore: 0,
    enrolledCampaigns: [],
    timeline: [],
    signals: [],
    tasks: [],
    aiSuggestions: [],
    details: [
      { label: "Type", value: typeLabel },
      { label: "Source", value: contact.source ?? "—" },
      ...(contact.email ? [{ label: "Email", value: contact.email }] : []),
      ...(contact.phone ? [{ label: "Phone", value: contact.phone }] : []),
    ],
  };
}
