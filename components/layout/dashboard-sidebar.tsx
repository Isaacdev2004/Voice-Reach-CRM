"use client";

import { useUpgradePlan } from "@/components/billing/upgrade-plan-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { dashboardNav, isActiveNav } from "@/lib/navigation";

type DashboardSidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function DashboardSidebar({ mobileOpen = false, onMobileClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { openUpgrade, billing } = useUpgradePlan();

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] lg:hidden"
          onClick={onMobileClose}
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 max-w-[85vw] flex-col border-r border-outline-variant/10 bg-ivory py-6 shadow-nav transition-transform duration-300 ease-out",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-hidden={!mobileOpen ? undefined : undefined}
      >
        <div className="mb-8 flex items-start justify-between px-6">
          <div>
            <h1 className="font-serif text-[26px] font-semibold text-ink">{BRAND_NAME}</h1>
            <p className="text-[13px] italic text-taupe">{BRAND_TAGLINE}</p>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-full p-2 text-taupe hover:bg-champagne lg:hidden"
            aria-label="Close menu"
          >
            <Icon name="close" className="text-[22px]" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto">
          {dashboardNav.map((item) => {
            const active = isActiveNav(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={cn(
                  "mx-2 my-1 flex items-center gap-3 rounded-full px-4 py-3 transition-all",
                  active
                    ? "bg-sage text-ivory shadow-sm"
                    : "text-taupe hover:bg-cream",
                )}
              >
                <Icon name={item.icon} />
                <span className="text-label-md font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 px-4">
          <p className="text-center text-[11px] text-taupe">
            {billing.planName} · ${billing.monthlyPrice}/mo
          </p>
          <button
            type="button"
            onClick={() => {
              openUpgrade();
              onMobileClose?.();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-gold py-4 text-label-md font-medium text-ivory transition-all hover:opacity-90 active:scale-95"
          >
            <Icon name="workspace_premium" className="text-[20px]" />
            Upgrade plan
          </button>
        </div>
      </aside>
    </>
  );
}
