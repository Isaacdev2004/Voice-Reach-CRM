"use client";

import { Icon } from "@/components/ui/icon";
import type { ChannelMetric } from "@/lib/analytics/types";

type ChannelBreakdownProps = {
  channels: ChannelMetric[];
};

export function ChannelBreakdown({ channels }: ChannelBreakdownProps) {
  return (
    <div className="space-y-4">
      {channels.map((ch) => (
        <div key={ch.id}>
          <div className="mb-1.5 flex items-center justify-between text-[14px]">
            <span className="flex items-center gap-2 text-ink">
              <Icon name={ch.icon} className="text-[18px] text-rose-gold-deep" />
              {ch.channel}
            </span>
            <span className="text-taupe">
              {ch.sent.toLocaleString()} · {ch.rate}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-champagne">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-gold to-sage"
              style={{ width: `${ch.rate}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
