"use client";

import { useUpgradePlan } from "@/components/billing/upgrade-plan-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { dashboardNav, isActiveNav } from "@/lib/navigation";

export function DashboardSidebar() {
  const pathname = usePathname();
  const { openUpgrade, billing } = useUpgradePlan();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-outline-variant/10 bg-ivory py-6 shadow-nav">
      <div className="px-6 mb-10">
        <h1 className="font-serif text-[26px] font-semibold text-ink">Voice Reach</h1>
        <p className="text-[13px] italic text-taupe">Relationships that open doors</p>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {dashboardNav.map((item) => {
          const active = isActiveNav(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mx-2 my-1 flex items-center gap-3 rounded-full px-4 py-3 transition-all",
                active
                  ? "bg-champagne text-ink shadow-sm"
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
          {billing.planName} · {billing.voiceMinutesUsed.toLocaleString()}/
          {billing.voiceMinutesLimit.toLocaleString()} min
        </p>
        <button
          type="button"
          onClick={openUpgrade}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-rose-gold py-4 text-label-md font-medium text-ivory transition-all hover:opacity-90 active:scale-95"
        >
          <Icon name="workspace_premium" className="text-[20px]" />
          Upgrade plan
        </button>
      </div>
    </aside>
  );
}
