"use client";

import { AiAssistantProvider } from "@/components/ai/ai-assistant-context";
import { AiAssistantSidebar } from "@/components/ai/ai-assistant-sidebar";
import { AiFloatingButton } from "@/components/ai/ai-launcher-button";
import { UpgradePlanProvider } from "@/components/billing/upgrade-plan-provider";
import { StartTrialTracker } from "@/components/marketing/start-trial-tracker";
import { CalendarPageHero } from "@/components/calendar/calendar-page-hero";
import { DashboardPageHero } from "@/components/layout/dashboard-page-hero";
import { SetupBanner } from "@/components/layout/setup-banner";
import { DashboardHeaderProvider } from "@/components/layout/dashboard-header-provider";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import {
  DASHBOARD_HERO_SLOT,
  DASHBOARD_MAIN_COLUMN,
} from "@/lib/dashboard/layout";
import {
  getDashboardHeroForPath,
  isPropertyFinderDashboardPath,
  normalizeDashboardPath,
} from "@/lib/dashboard/page-heroes";
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
    searchPlaceholder: "Search contacts or campaigns",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/contacts": {
    searchPlaceholder: "Search contacts, tags, or phone numbers...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/campaigns": {
    searchPlaceholder: "Search campaigns, contacts, or ask MyARI...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/voice-scripts": {
    searchPlaceholder: "Search voice scripts, campaigns, or keywords...",
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
  "/dashboard/notes": {
    searchPlaceholder: "Search notes and strategy...",
    showQuickCreate: true,
    fullWidth: true,
  },
  "/dashboard/mortgage": {
    searchPlaceholder: "Mortgage calculator...",
    showQuickCreate: false,
    fullWidth: true,
  },
  "/dashboard/properties": {
    searchPlaceholder: "Search clients, properties, or campaigns...",
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
  const normalizedPath = normalizeDashboardPath(pathname ?? "");
  const pageHero = getDashboardHeroForPath(normalizedPath);
  const isCalendarRoute = normalizedPath === "/dashboard/calendar";
  const isPropertyFinderRoute = isPropertyFinderDashboardPath(normalizedPath);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (isPropertyFinderRoute) {
      root.dataset.dashboardRoute = "properties";
    } else {
      delete root.dataset.dashboardRoute;
    }
    return () => {
      delete root.dataset.dashboardRoute;
    };
  }, [isPropertyFinderRoute]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const mainClass = config.fullWidth
    ? "box-border block min-h-screen w-full overflow-x-hidden pt-16 lg:ml-64 lg:w-[calc(100%-16rem)]"
    : "box-border block min-h-screen w-full overflow-x-hidden px-4 pb-12 pt-24 lg:ml-64 lg:w-[calc(100%-16rem)] lg:px-margin-desktop";

  return (
    <UpgradePlanProvider>
      <StartTrialTracker />
      <AiAssistantProvider>
        <DashboardHeaderProvider
          searchPlaceholder={config.searchPlaceholder}
          showQuickCreate={config.showQuickCreate ?? true}
          onMenuClick={() => setMobileNavOpen(true)}
        >
          <div className="myari-workspace min-h-screen bg-cream text-on-surface">
            <DashboardSidebar
              mobileOpen={mobileNavOpen}
              onMobileClose={() => setMobileNavOpen(false)}
            />
            <main className={mainClass}>
              <SetupBanner />
              {isPropertyFinderRoute ? (
                <div className={DASHBOARD_MAIN_COLUMN}>{children}</div>
              ) : (
                <div className={DASHBOARD_MAIN_COLUMN}>
                  <div id="dashboard-hero-mount" className={DASHBOARD_HERO_SLOT}>
                    {isCalendarRoute ? (
                      <CalendarPageHero />
                    ) : pageHero ? (
                      <DashboardPageHero
                        config={pageHero}
                        pathname={normalizedPath}
                      />
                    ) : null}
                  </div>
                  {children}
                </div>
              )}
            </main>
          </div>
          <AiFloatingButton />
          <AiAssistantSidebar />
        </DashboardHeaderProvider>
      </AiAssistantProvider>
    </UpgradePlanProvider>
  );
}

