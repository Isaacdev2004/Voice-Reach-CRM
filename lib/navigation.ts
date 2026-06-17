export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export const dashboardNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Contacts", href: "/dashboard/contacts", icon: "person" },
  { label: "Tasks", href: "/dashboard/tasks", icon: "task_alt" },
  { label: "Calendar", href: "/dashboard/calendar", icon: "calendar_today" },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: "campaign" },
  { label: "Voice Scripts", href: "/dashboard/voice-scripts", icon: "description" },
  { label: "Automations", href: "/dashboard/automations", icon: "auto_mode" },
  { label: "Activity Logs", href: "/dashboard/activity", icon: "history" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "analytics" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

export function isActiveNav(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}
