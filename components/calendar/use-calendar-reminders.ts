"use client";

import { useEffect, useRef, useState } from "react";

type ReminderEvent = {
  id: string;
  title: string;
  starts_at: string;
};

const REMIND_MS = 15 * 60 * 1000;

export function useCalendarReminders(events: ReminderEvent[]) {
  const [activeReminder, setActiveReminder] = useState<ReminderEvent | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      for (const event of events) {
        const start = new Date(event.starts_at).getTime();
        const delta = start - now;
        if (delta > 0 && delta <= REMIND_MS && !notifiedRef.current.has(event.id)) {
          notifiedRef.current.add(event.id);
          setActiveReminder(event);
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [events]);

  const dismissReminder = () => setActiveReminder(null);

  return { activeReminder, dismissReminder };
}
