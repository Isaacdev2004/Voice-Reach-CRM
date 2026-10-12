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

export type CalendarViewMode = "month" | "week" | "day";

type MonthCalendarProps = {
  viewDate: Date;
  onViewDateChange: (date: Date) => void;
  events: CalendarAgendaItem[];
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  /** When set, clicking a day cell selects it and runs this (e.g. open add-event modal). */
  onDayClick?: (date: Date) => void;
  viewMode?: CalendarViewMode;
  onViewModeChange?: (mode: CalendarViewMode) => void;
};

function eventChipClass(source?: CalendarAgendaItem["source"]) {
  if (source === "task") return "bg-amber-100/90 text-amber-950";
  if (source === "google") return "bg-sage-light/80 text-emerald-muted";
  return "bg-rose-gold/15 text-rose-gold-deep";
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

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
  viewMode = "month",
  onViewModeChange,
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
    <div className="w-full min-w-0">
      <div className="mb-3 flex flex-col gap-3 sm:mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/30 hover:bg-champagne sm:h-10 sm:w-10"
            aria-label="Previous month"
          >
            <Icon name="chevron_left" className="text-[22px]" />
          </button>
          <h2 className="min-w-[140px] text-center font-serif text-[20px] font-semibold text-ink sm:text-[26px]">
            {monthLabel}
          </h2>
          <button
            type="button"
            onClick={nextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant/30 hover:bg-champagne sm:h-10 sm:w-10"
            aria-label="Next month"
          >
            <Icon name="chevron_right" className="text-[22px]" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["month", "week", "day"] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange?.(mode)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-medium capitalize sm:px-4 sm:text-[13px]",
                viewMode === mode
                  ? "bg-rose-gold text-ivory"
                  : "border border-outline-variant/25 text-taupe hover:bg-champagne",
              )}
            >
              {mode}
            </button>
          ))}
          <button
            type="button"
            onClick={goToday}
            className="rounded-full border border-outline-variant/30 px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-champagne sm:px-4 sm:py-2 sm:text-[13px]"
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid w-full grid-cols-7 gap-px overflow-hidden rounded-2xl border border-outline-variant/20 bg-outline-variant/15">
        {WEEKDAYS.map((day, i) => (
          <div
            key={`${day}-${i}`}
            className="bg-cream/80 px-0.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-taupe sm:px-2 sm:py-3 sm:text-[11px]"
          >
            <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
            <span className="hidden sm:inline">{day}</span>
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
              title="Tap to view this day"
              className={cn(
                "min-h-[52px] bg-ivory p-1 text-left transition-colors hover:bg-cream/70 sm:min-h-[88px] sm:p-2 md:min-h-[100px]",
                !inMonth && "bg-cream/40 text-taupe/60",
                isSelected && "bg-champagne/70 ring-2 ring-inset ring-rose-gold-deep/40",
                onDayClick && "cursor-pointer hover:ring-1 hover:ring-inset hover:ring-rose-gold/30",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium sm:h-7 sm:w-7 sm:text-[13px]",
                  isToday && "bg-sage text-ivory",
                  !isToday && "text-ink",
                )}
              >
                {day.getDate()}
              </span>
              <div className="mt-0.5 hidden space-y-0.5 sm:mt-1 sm:block">
                {dayEvents.slice(0, 2).map((ev) => (
                  <p
                    key={ev.id}
                    className={cn(
                      "flex items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:text-[11px]",
                      eventChipClass(ev.source),
                    )}
                  >
                    {ev.source === "task" ? (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" aria-hidden />
                    ) : null}
                    <span className="truncate">{ev.title}</span>
                  </p>
                ))}
                {dayEvents.length > 2 ? (
                  <p className="text-[10px] font-medium text-taupe">+{dayEvents.length - 2} more</p>
                ) : null}
              </div>
              {dayEvents.length > 0 ? (
                <div className="mt-0.5 flex justify-center gap-0.5 sm:hidden">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <span key={ev.id} className="h-1 w-1 rounded-full bg-sage" />
                  ))}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
