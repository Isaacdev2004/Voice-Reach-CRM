"use client";

import { usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

type DashboardShellProps = {
  children: React.ReactNode;
};

const headerConfig: Record<
  string,
  { searchPlaceholder?: string; showQuickCreate?: boolean; showUserMeta?: boolean; fullWidth?: boolean }
> = {
  "/dashboard": {
    searchPlaceholder: "Search data, contacts, campaigns...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/contacts": {
    searchPlaceholder: "Search contacts, tags, or phone numbers...",
    showQuickCreate: false,
    showUserMeta: true,
    fullWidth: true,
  },
  "/dashboard/campaigns": {
    searchPlaceholder: "Search CRM...",
    fullWidth: true,
  },
  "/dashboard/voice-scripts": {
    searchPlaceholder: "Search recordings or scripts...",
    fullWidth: true,
  },
  "/dashboard/automations": {
    searchPlaceholder: "Search workflows...",
    showQuickCreate: false,
    fullWidth: true,
  },
  "/dashboard/analytics": {
    searchPlaceholder: "Search analytics data...",
    fullWidth: true,
  },
  "/dashboard/settings": {
    searchPlaceholder: "Search settings...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/activity": {
    searchPlaceholder: "Search activity logs...",
    showQuickCreate: false,
  },
};

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const config = headerConfig[pathname] ?? {};

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      <DashboardSidebar />
      <DashboardHeader
        searchPlaceholder={config.searchPlaceholder}
        showQuickCreate={config.showQuickCreate ?? true}
        showUserMeta={config.showUserMeta ?? false}
      />
      <main
        className={
          config.fullWidth
            ? "ml-64 min-h-screen pt-16"
            : "ml-64 min-h-screen px-margin-desktop pb-12 pt-24"
        }
      >
        {children}
      </main>
    </div>
  );
}

