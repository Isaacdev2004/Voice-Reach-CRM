"use client";

import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icon";
import { useMemo } from "react";

export type CalendarAgendaItem = {
  id: string;
  title: string;
  starts_at: string;
  source?: "google" | "crm" | "task";
};

type MonthCalendarProps = {
  viewDate: Date;
  onViewDateChange: (date: Date) => void;
  events: CalendarAgendaItem[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  /** When set, clicking a day cell selects it and runs this (e.g. open add-event modal). */
  onDayClick?: (date: Date) => void;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(viewDate: Date): Date[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }
  return cells;
}

export function MonthCalendar({
  viewDate,
  onViewDateChange,
  events,
  selectedDate,
  onSelectDate,
  onDayClick,
}: MonthCalendarProps) {
  const today = new Date();
  const cells = useMemo(() => buildMonthGrid(viewDate), [viewDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarAgendaItem[]>();
    for (const event of events) {
      const key = dateKey(new Date(event.starts_at));
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [events]);

  const monthLabel = viewDate.toLocaleString(undefined, { month: "long", year: "numeric" });

  const prevMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    onViewDateChange(d);
  };

  const nextMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    onViewDateChange(d);
  };

  const goToday = () => {
    const now = new Date();
    onViewDateChange(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(now);
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-[26px] font-semibold text-ink">{monthLabel}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToday}
            className="rounded-full border border-outline-variant/30 px-4 py-2 text-[13px] font-medium text-ink hover:bg-champagne"
          >
            Today
          </button>
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/30 hover:bg-champagne"
            aria-label="Previous month"
          >
            <Icon name="chevron_left" className="text-[22px]" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/30 hover:bg-champagne"
            aria-label="Next month"
          >
            <Icon name="chevron_right" className="text-[22px]" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-outline-variant/20 bg-outline-variant/15">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="bg-cream/80 px-2 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-taupe"
          >
            {day}
          </div>
        ))}

        {cells.map((day) => {
          const inMonth = day.getMonth() === viewDate.getMonth();
          const isToday = sameDay(day, today);
          const isSelected = selectedDate ? sameDay(day, selectedDate) : false;
          const dayEvents = eventsByDay.get(dateKey(day)) ?? [];

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => {
                onSelectDate(day);
                onDayClick?.(day);
              }}
              title="Click to add an event on this day"
              className={cn(
                "min-h-[88px] bg-ivory p-2 text-left transition-colors hover:bg-cream/70 sm:min-h-[100px]",
                !inMonth && "bg-cream/40 text-taupe/60",
                isSelected && "ring-2 ring-inset ring-rose-gold-deep/50",
                onDayClick && "cursor-pointer hover:ring-1 hover:ring-inset hover:ring-rose-gold/30",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-medium",
                  isToday && "bg-sage text-ivory",
                  !isToday && "text-ink",
                )}
              >
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 2).map((ev) => (
                  <p
                    key={ev.id}
                    className="truncate rounded-md bg-sage-light/80 px-1.5 py-0.5 text-[10px] font-medium text-emerald-muted sm:text-[11px]"
                  >
                    {ev.title}
                  </p>
                ))}
                {dayEvents.length > 2 ? (
                  <p className="text-[10px] font-medium text-taupe">+{dayEvents.length - 2} more</p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
