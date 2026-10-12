"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const ACTIONS = [
  { label: "Schedule event", icon: "event", onClickKey: "event" as const },
  { label: "Create task", icon: "task_alt", href: "/dashboard/tasks?new=task" },
  { label: "Log callback", icon: "phone_callback", onClickKey: "event" as const },
  { label: "Add reminder", icon: "notifications", onClickKey: "event" as const },
];

type CalendarQuickActionsProps = {
  onScheduleEvent: () => void;
};

export function CalendarQuickActions({ onScheduleEvent }: CalendarQuickActionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
      {ACTIONS.map((action) =>
        action.href ? (
          <Link
            key={action.label}
            href={action.href}
            className="flex flex-col items-center gap-2 rounded-2xl border border-outline-variant/15 bg-cream/40 px-3 py-4 text-center transition-colors hover:bg-champagne/60"
          >
            <Icon name={action.icon} className="text-[22px] text-rose-gold-deep" />
            <span className="text-[12px] font-medium text-ink">{action.label}</span>
          </Link>
        ) : (
          <button
            key={action.label}
            type="button"
            onClick={onScheduleEvent}
            className="flex flex-col items-center gap-2 rounded-2xl border border-outline-variant/15 bg-cream/40 px-3 py-4 text-center transition-colors hover:bg-champagne/60"
          >
            <Icon name={action.icon} className="text-[22px] text-rose-gold-deep" />
            <span className="text-[12px] font-medium text-ink">{action.label}</span>
          </button>
        ),
      )}
    </div>
  );
}
