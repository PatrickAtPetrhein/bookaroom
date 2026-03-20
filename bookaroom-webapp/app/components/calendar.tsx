"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toIsoDate, formatHumanDate } from "@/lib/attendance";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type CalendarDay = {
  date: Date;
  iso: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isWeekend: boolean;
};

function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const today = new Date();
  const todayStr = toIsoDate(today);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = (firstOfMonth.getDay() + 6) % 7; // Mon=0 ... Sun=6

  const cells: CalendarDay[] = [];

  for (let i = startDow; i > 0; i--) {
    const d = new Date(year, month, 1 - i);
    const iso = toIsoDate(d);
    cells.push({
      date: d, iso, dayOfMonth: d.getDate(),
      isCurrentMonth: false,
      isToday: iso === todayStr,
      isPast: d < todayStart,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const iso = toIsoDate(d);
    cells.push({
      date: d, iso, dayOfMonth: day,
      isCurrentMonth: true,
      isToday: iso === todayStr,
      isPast: d < todayStart,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    });
  }

  const remainder = cells.length % 7;
  if (remainder > 0) {
    const trailing = 7 - remainder;
    for (let i = 1; i <= trailing; i++) {
      const d = new Date(year, month + 1, i);
      const iso = toIsoDate(d);
      cells.push({
        date: d, iso, dayOfMonth: d.getDate(),
        isCurrentMonth: false,
        isToday: iso === todayStr,
        isPast: d < todayStart,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      });
    }
  }

  return cells;
}

type CalendarProps = {
  selectedDates?: Set<string>;
  onToggleDate?: (iso: string) => void;
  teamCounts?: Map<string, number>;
  onSelectDay?: (iso: string) => void;
  activeDay?: string | null;
  className?: string;
};

export function Calendar({
  selectedDates,
  onToggleDate,
  teamCounts,
  onSelectDay,
  activeDay,
  className,
}: CalendarProps) {
  const now = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const canGoPrev =
    viewYear > now.getFullYear() ||
    (viewYear === now.getFullYear() && viewMonth > now.getMonth());

  const maxAhead = 3;
  const limitMonth = now.getMonth() + maxAhead;
  const limitYear = now.getFullYear() + Math.floor(limitMonth / 12);
  const limitMo = limitMonth % 12;
  const canGoNext =
    viewYear < limitYear || (viewYear === limitYear && viewMonth < limitMo);

  function navigate(delta: -1 | 1) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setViewMonth(m);
    setViewYear(y);
  }

  const maxCount = useMemo(() => {
    if (!teamCounts) return 0;
    let m = 0;
    teamCounts.forEach((v) => { if (v > m) m = v; });
    return m;
  }, [teamCounts]);

  function heatBg(count: number): string {
    if (count === 0 || maxCount === 0) return "";
    const ratio = count / maxCount;
    if (ratio <= 0.25) return "bg-primary/[0.04]";
    if (ratio <= 0.5) return "bg-primary/[0.08]";
    if (ratio <= 0.75) return "bg-primary/[0.14]";
    return "bg-primary/[0.22]";
  }

  return (
    <div className={cn("select-none", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-tight">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h3>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canGoPrev}
            onClick={() => navigate(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!canGoNext}
            onClick={() => navigate(1)}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className={cn(
              "py-1.5 text-center text-xs font-medium",
              label === "Sat" || label === "Sun"
                ? "text-muted-foreground/50"
                : "text-muted-foreground",
            )}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const isSelected = selectedDates?.has(cell.iso) ?? false;
          const count = teamCounts?.get(cell.iso) ?? 0;
          const isActive = activeDay === cell.iso;
          const isInteractive = cell.isCurrentMonth && !cell.isPast;

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={!isInteractive}
              onClick={() => {
                if (!isInteractive) return;
                onToggleDate?.(cell.iso);
                onSelectDay?.(cell.iso);
              }}
              title={cell.isCurrentMonth ? formatHumanDate(cell.iso) : undefined}
              className={cn(
                "relative mx-px my-px flex h-14 flex-col items-center justify-center rounded-lg text-sm transition-all duration-150",
                !cell.isCurrentMonth && "text-muted-foreground/25",
                cell.isCurrentMonth && cell.isPast && "text-muted-foreground/35",
                cell.isCurrentMonth && cell.isWeekend && !cell.isPast && "text-muted-foreground/50",
                cell.isCurrentMonth && !cell.isPast && !cell.isWeekend && "text-foreground",
                isInteractive && !isSelected && !isActive && "cursor-pointer hover:bg-muted",
                !isInteractive && "cursor-default",
                isSelected && "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-semibold",
                isActive && !isSelected && "ring-2 ring-primary ring-offset-1",
                !isSelected && count > 0 && cell.isCurrentMonth && heatBg(count),
                cell.isToday && !isSelected && "font-bold",
              )}
            >
              <span className="leading-none">{cell.dayOfMonth}</span>

              {cell.isToday && !isSelected && (
                <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
              )}

              {teamCounts && count > 0 && cell.isCurrentMonth && (
                <span
                  className={cn(
                    "mt-0.5 text-[10px] leading-none",
                    isSelected
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
