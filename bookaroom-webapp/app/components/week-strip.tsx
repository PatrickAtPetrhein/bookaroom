"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { getWorkdaysForWeek, toIsoDate, formatHumanDate } from "@/lib/attendance";

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr"];

type WeekStripProps = {
  weekOffset: number;
  selectedDates: Set<string>;
  onToggleDate: (iso: string) => void;
};

export function WeekStrip({ weekOffset, selectedDates, onToggleDate }: WeekStripProps) {
  const workdays = useMemo(() => getWorkdaysForWeek(weekOffset), [weekOffset]);
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const selectedCount = workdays.filter((d) => selectedDates.has(d)).length;

  return (
    <div>
      <div className="flex gap-2">
        {workdays.map((iso, i) => {
          const isSelected = selectedDates.has(iso);
          const isPast = iso < todayIso;

          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => onToggleDate(iso)}
              title={formatHumanDate(iso)}
              className={cn(
                "flex h-10 flex-1 items-center justify-center rounded-lg text-xs font-medium transition-all",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isPast
                    ? "bg-muted/50 text-muted-foreground/30 cursor-default"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 cursor-pointer",
              )}
            >
              {DAY_LABELS[i]}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
        {selectedCount} of 5 workdays
      </p>
    </div>
  );
}
