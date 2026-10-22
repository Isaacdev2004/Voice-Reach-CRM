import { PremiumPageHeader } from "@/components/layout/premium-page-header";
import { isPropertyFinderDashboardPath, type DashboardPageHeroConfig } from "@/lib/dashboard/page-heroes";

export function DashboardPageHero({ config, pathname, className }: {
  config: DashboardPageHeroConfig;
  pathname: string;
  className?: string;
}) {
  if (isPropertyFinderDashboardPath(pathname)) return null;
  const compact = ["tasks", "notes", "activity", "analytics", "settings", "automations", "partners"].some(
    (tab) => pathname === `/dashboard/${tab}`,
  );
  return <PremiumPageHeader config={config} compact={compact} className={className} />;
}
