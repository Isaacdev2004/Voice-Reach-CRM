"use client";
import { ConciergeEntry } from "@/components/concierge/entry";

import { useUpgradePlan } from "@/components/billing/upgrade-plan-provider";
import { AriLogo } from "@/components/brand/ari-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { BRAND_TAGLINE } from "@/lib/brand";
import { cn } from "@/lib/cn";
import { dashboardNav, isActiveNav } from "@/lib/navigation";

type DashboardSidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function DashboardSidebar({
  mobileOpen = false,
  onMobileClose,
}: DashboardSidebarProps) {
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
          "dashboard-sidebar fixed left-0 top-0 z-50 flex h-screen w-64 max-w-[85vw] flex-col border-r border-outline-variant/10 bg-cream py-4 shadow-[2px_0_24px_-12px_rgba(26,22,18,0.06)] transition-transform duration-300 ease-out lg:py-5",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-hidden={!mobileOpen ? undefined : undefined}
      >
        <div className="mb-4 flex items-start justify-between px-5 lg:mb-5 lg:px-6">
          <Link
            href="/dashboard"
            className="dashboard-sidebar-brand group"
            onClick={onMobileClose}
          >
            <AriLogo height={96} className="max-w-[128px]" />
            <p className="mt-1.5 text-[11px] italic leading-snug text-taupe transition-colors group-hover:text-rose-gold-deep">
              {BRAND_TAGLINE}
            </p>
          </Link>
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-full p-2 text-taupe hover:bg-champagne/80 lg:hidden"
            aria-label="Close menu"
          >
            <Icon name="close" className="text-[22px]" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {dashboardNav.map((item) => {
            const active = isActiveNav(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "dashboard-nav-item flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[14px] transition-colors duration-150",
                  active
                    ? "dashboard-nav-active font-medium text-ivory"
                    : "text-taupe hover:bg-ivory/60 hover:text-ink",
                )}
              >
                <Icon name={item.icon} className="text-[20px] opacity-90" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <ConciergeEntry />

        <div className="dashboard-upgrade mt-auto space-y-2.5 border-t border-outline-variant/10 px-4 pb-1 pt-4">
          <div className="flex justify-center text-rose-gold-deep">
            <Icon name="diamond" className="text-[26px]" />
          </div>
          <p className="dashboard-upgrade-heading">Your next chapter</p>
          <p className="text-center text-[11px] leading-snug text-taupe">
            {billing.subscriptionStatus === "active"
              ? `${billing.planName} · $${billing.billedAmount ?? billing.monthlyPrice}/${billing.billingPeriod === "yearly" ? "yr" : "mo"}`
              : billing.subscriptionStatus === "trialing"
                ? `${billing.planName} · free trial`
                : "No active plan"}
          </p>
          <button
            type="button"
            onClick={() => {
              openUpgrade();
              onMobileClose?.();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-gold py-3 text-[13px] font-medium text-ivory transition-all hover:opacity-92 active:scale-[0.98] motion-reduce:active:scale-100"
          >
            <Icon name="workspace_premium" className="text-[18px]" />
            Upgrade plan
          </button>
        </div>
      </aside>
    </>
  );
}
