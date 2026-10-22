"use client";

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
          "premium-sidebar fixed left-0 top-0 z-50 flex h-screen w-64 max-w-[85vw] flex-col border-r border-outline-variant/10 bg-ivory py-6 shadow-nav transition-transform duration-300 ease-out",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        data-mobile-open={mobileOpen}
      >
        <div className="mb-3 flex items-start justify-between px-6">
          <Link href="/dashboard" className="group" onClick={onMobileClose}>
            <AriLogo height={96} className="max-w-[148px]" />
            <p className="mt-2.5 text-[13px] italic leading-snug text-taupe group-hover:text-rose-gold-deep">
              {BRAND_TAGLINE}
            </p>
          </Link>
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-full p-2 text-taupe hover:bg-champagne lg:hidden"
            aria-label="Close menu"
          >
            <Icon name="close" className="text-[22px]" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="premium-navigation flex-1 overflow-y-auto px-3 py-2">
          {dashboardNav.map((item) => {
            const active = isActiveNav(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "my-1 flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors",
                  active
                    ? "bg-champagne text-ink font-semibold shadow-[inset_3px_0_0_var(--color-rose-gold-deep)]"
                    : "text-taupe hover:bg-champagne/80",
                )}
              >
                <Icon name={item.icon} className="w-5 shrink-0 text-[20px] text-rose-gold-deep" />
                <span className="text-label-md font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 px-4">
          <p className="text-center text-[11px] text-taupe">
            {billing.subscriptionStatus === "active"
              ? `${billing.planName} · $${billing.monthlyPrice}/mo`
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
            className="premium-button premium-button--primary w-full"
          >
            <Icon name="workspace_premium" className="text-[20px]" />
            Upgrade plan
          </button>
        </div>
      </aside>
    </>
  );
}
