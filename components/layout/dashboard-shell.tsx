"use client";

import { AiAssistantProvider } from "@/components/ai/ai-assistant-context";
import { AiAssistantSidebar } from "@/components/ai/ai-assistant-sidebar";
import { AiFloatingButton } from "@/components/ai/ai-launcher-button";
import { UpgradePlanProvider } from "@/components/billing/upgrade-plan-provider";
import { SetupBanner } from "@/components/layout/setup-banner";
import { DashboardHeaderProvider } from "@/components/layout/dashboard-header-provider";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type DashboardShellProps = {
  children: React.ReactNode;
};

const headerConfig: Record<
  string,
  { searchPlaceholder?: string; showQuickCreate?: boolean; fullWidth?: boolean }
> = {
  "/dashboard": {
    searchPlaceholder: "Search data, contacts, campaigns...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/contacts": {
    searchPlaceholder: "Search contacts, tags, or phone numbers...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/campaigns": {
    searchPlaceholder: "Search campaigns...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/voice-scripts": {
    searchPlaceholder: "Search recordings or scripts...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/automations": {
    searchPlaceholder: "Search workflows...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/analytics": {
    searchPlaceholder: "Search analytics data...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/settings": {
    searchPlaceholder: "Search settings...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/activity": {
    searchPlaceholder: "Search activity logs...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/calendar": {
    searchPlaceholder: "Search calendar events...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/tasks": {
    searchPlaceholder: "Search tasks...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/partners": {
    searchPlaceholder: "Search partner workspaces...",
    showQuickCreate: true,
    fullWidth: true,
  },
};

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const config = headerConfig[pathname] ?? {
    searchPlaceholder: "Search...",
    showQuickCreate: true,
    fullWidth: true,
  };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const mainClass = config.fullWidth
    ? "min-h-screen pt-16 lg:ml-64"
    : "min-h-screen px-4 pb-12 pt-24 lg:ml-64 lg:px-margin-desktop";

  return (
    <UpgradePlanProvider>
      <AiAssistantProvider>
        <DashboardHeaderProvider
          searchPlaceholder={config.searchPlaceholder}
          showQuickCreate={config.showQuickCreate ?? true}
          onMenuClick={() => setMobileNavOpen(true)}
        >
          <div className="min-h-screen bg-cream text-on-surface">
            <DashboardSidebar
              mobileOpen={mobileNavOpen}
              onMobileClose={() => setMobileNavOpen(false)}
            />
            <main className={mainClass}>
              <SetupBanner />
              {children}
            </main>
            <AiFloatingButton />
            <AiAssistantSidebar />
          </div>
        </DashboardHeaderProvider>
      </AiAssistantProvider>
    </UpgradePlanProvider>
  );
}

