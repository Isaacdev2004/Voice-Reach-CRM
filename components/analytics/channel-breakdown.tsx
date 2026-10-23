"use client";

import { Icon } from "@/components/ui/icon";
import type { ChannelMetric } from "@/lib/analytics/types";

type ChannelBreakdownProps = {
  channels: ChannelMetric[];
};

export function ChannelBreakdown({ channels }: ChannelBreakdownProps) {
  if (channels.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-slate-text">
        No outbound sends recorded for this period. Channel mix appears after
        campaign steps are delivered.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {channels.map((ch) => (
        <div key={ch.id}>
          <div className="mb-1.5 flex items-center justify-between text-[14px]">
            <span className="flex items-center gap-2 text-ink">
              <Icon
                name={ch.icon}
                className="text-[18px] text-rose-gold-deep"
              />
              {ch.channel}
            </span>
            <span className="text-taupe">
              {ch.sent.toLocaleString()} observed sent ·{" "}
              {ch.rate === null
                ? "Rate unavailable"
                : `${ch.rate.toFixed(1)}% delivered`}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-champagne">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-gold to-sage"
              style={{ width: `${ch.rate ?? 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
