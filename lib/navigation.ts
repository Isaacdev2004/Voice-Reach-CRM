export type NavItem = {
  label: string;
  href: string;
  icon: string;
};

export const dashboardNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Contacts", href: "/dashboard/contacts", icon: "person" },
  { label: "Property Finder", href: "/dashboard/properties", icon: "location_on" },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: "campaign" },
  { label: "Calendar", href: "/dashboard/calendar", icon: "calendar_today" },
  { label: "Mortgage", href: "/dashboard/mortgage", icon: "calculate" },
  { label: "Notes & Strategy", href: "/dashboard/notes", icon: "edit_note" },
  { label: "Tasks", href: "/dashboard/tasks", icon: "task_alt" },
  { label: "Voice Scripts", href: "/dashboard/voice-scripts", icon: "description" },
  { label: "Activity Logs", href: "/dashboard/activity", icon: "history" },
  { label: "Analytics", href: "/dashboard/analytics", icon: "analytics" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

export function isActiveNav(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}
