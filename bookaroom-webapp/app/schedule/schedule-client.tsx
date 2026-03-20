"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/app/components/calendar";
import { WeekStrip } from "@/app/components/week-strip";
import { cn } from "@/lib/utils";
import { formatHumanDate, getWorkdaysForWeek, toIsoDate } from "@/lib/attendance";
import { createClient } from "@/lib/supabase/client";

type ScheduleClientProps = {
  userId: string;
  companyId: string;
  initialDates: string[];
  initialTeamCounts: Record<string, number>;
};

export function ScheduleClient({
  userId,
  companyId,
  initialDates,
  initialTeamCounts,
}: ScheduleClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedDates, setSelectedDates] = useState(() => new Set(initialDates));
  const [teamCounts, setTeamCounts] = useState(
    () => new Map(Object.entries(initialTeamCounts)),
  );
  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const toggleDate = useCallback(
    async (iso: string) => {
      if (iso < todayIso) return;

      const wasSelected = selectedDates.has(iso);

      setSelectedDates((prev) => {
        const next = new Set(prev);
        if (wasSelected) next.delete(iso);
        else next.add(iso);
        return next;
      });
      setTeamCounts((prev) => {
        const next = new Map(prev);
        if (wasSelected) {
          next.set(iso, Math.max(0, (next.get(iso) ?? 1) - 1));
        } else {
          next.set(iso, (next.get(iso) ?? 0) + 1);
        }
        return next;
      });

      if (wasSelected) {
        const { error } = await supabase
          .from("attendance_days")
          .delete()
          .eq("user_id", userId)
          .eq("office_date", iso);

        if (error) {
          setSelectedDates((prev) => {
            const next = new Set(prev);
            next.add(iso);
            return next;
          });
          setTeamCounts((prev) => {
            const next = new Map(prev);
            next.set(iso, (next.get(iso) ?? 0) + 1);
            return next;
          });
          toast.error("Failed to remove day", { description: error.message });
        } else {
          toast.success(`Removed ${formatHumanDate(iso)}`);
        }
      } else {
        const { error } = await supabase.from("attendance_days").upsert(
          {
            user_id: userId,
            company_id: companyId,
            office_date: iso,
            status: "in_office",
          },
          { onConflict: "user_id,office_date" },
        );

        if (error) {
          setSelectedDates((prev) => {
            const next = new Set(prev);
            next.delete(iso);
            return next;
          });
          setTeamCounts((prev) => {
            const next = new Map(prev);
            next.set(iso, Math.max(0, (next.get(iso) ?? 1) - 1));
            return next;
          });
          toast.error("Failed to add day", { description: error.message });
        } else {
          toast.success(`Added ${formatHumanDate(iso)}`);
        }
      }
    },
    [selectedDates, supabase, userId, companyId, todayIso],
  );

  const batchUpdate = useCallback(
    async (mode: "fill" | "clear", weekOffset: number) => {
      const workdays = getWorkdaysForWeek(weekOffset);

      if (mode === "fill") {
        const toAdd = workdays.filter((d) => !selectedDates.has(d) && d >= todayIso);
        if (toAdd.length === 0) {
          toast.info("All workdays already selected");
          return;
        }

        setSelectedDates((prev) => {
          const next = new Set(prev);
          toAdd.forEach((d) => next.add(d));
          return next;
        });
        setTeamCounts((prev) => {
          const next = new Map(prev);
          toAdd.forEach((d) => next.set(d, (next.get(d) ?? 0) + 1));
          return next;
        });

        const rows = toAdd.map((d) => ({
          user_id: userId,
          company_id: companyId,
          office_date: d,
          status: "in_office" as const,
        }));

        const { error } = await supabase
          .from("attendance_days")
          .upsert(rows, { onConflict: "user_id,office_date" });

        if (error) {
          setSelectedDates((prev) => {
            const next = new Set(prev);
            toAdd.forEach((d) => next.delete(d));
            return next;
          });
          setTeamCounts((prev) => {
            const next = new Map(prev);
            toAdd.forEach((d) =>
              next.set(d, Math.max(0, (next.get(d) ?? 1) - 1)),
            );
            return next;
          });
          toast.error("Failed to update schedule");
        } else {
          toast.success(`Added ${toAdd.length} day${toAdd.length > 1 ? "s" : ""}`);
        }
      } else {
        const toRemove = workdays.filter((d) => selectedDates.has(d) && d >= todayIso);
        if (toRemove.length === 0) {
          toast.info("No days to clear");
          return;
        }

        setSelectedDates((prev) => {
          const next = new Set(prev);
          toRemove.forEach((d) => next.delete(d));
          return next;
        });
        setTeamCounts((prev) => {
          const next = new Map(prev);
          toRemove.forEach((d) =>
            next.set(d, Math.max(0, (next.get(d) ?? 1) - 1)),
          );
          return next;
        });

        const { error } = await supabase
          .from("attendance_days")
          .delete()
          .eq("user_id", userId)
          .in("office_date", toRemove);

        if (error) {
          setSelectedDates((prev) => {
            const next = new Set(prev);
            toRemove.forEach((d) => next.add(d));
            return next;
          });
          setTeamCounts((prev) => {
            const next = new Map(prev);
            toRemove.forEach((d) =>
              next.set(d, (next.get(d) ?? 0) + 1),
            );
            return next;
          });
          toast.error("Failed to update schedule");
        } else {
          toast.success(
            `Removed ${toRemove.length} day${toRemove.length > 1 ? "s" : ""}`,
          );
        }
      }
    },
    [selectedDates, supabase, userId, companyId, todayIso],
  );

  const upcomingDays = useMemo(() => {
    return Array.from(selectedDates)
      .filter((d) => d >= todayIso)
      .sort()
      .slice(0, 10);
  }, [selectedDates, todayIso]);

  const totalSelected = useMemo(() => {
    return Array.from(selectedDates).filter((d) => d >= todayIso).length;
  }, [selectedDates, todayIso]);

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
      <Card>
        <CardContent className="pt-6">
          <Calendar
            selectedDates={selectedDates}
            onToggleDate={toggleDate}
            teamCounts={teamCounts}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Click a day to toggle. Numbers show total people in office.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDays className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{totalSelected}</p>
                <p className="text-xs text-muted-foreground">upcoming office days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">This Week</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="xs" onClick={() => batchUpdate("fill", 0)}>
                  Fill
                </Button>
                <Button variant="ghost" size="xs" onClick={() => batchUpdate("clear", 0)}>
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WeekStrip
              weekOffset={0}
              selectedDates={selectedDates}
              onToggleDate={toggleDate}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Next Week</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="xs" onClick={() => batchUpdate("fill", 1)}>
                  Fill
                </Button>
                <Button variant="ghost" size="xs" onClick={() => batchUpdate("clear", 1)}>
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <WeekStrip
              weekOffset={1}
              selectedDates={selectedDates}
              onToggleDate={toggleDate}
            />
          </CardContent>
        </Card>

        {upcomingDays.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Upcoming
                <Badge variant="secondary" className="ml-2">
                  {totalSelected}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {upcomingDays.map((iso) => {
                  const count = teamCounts.get(iso) ?? 0;
                  return (
                    <li
                      key={iso}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className={cn(iso === todayIso && "font-semibold")}>
                        {formatHumanDate(iso)}
                      </span>
                      {count > 1 && (
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {count} people
                        </span>
                      )}
                    </li>
                  );
                })}
                {totalSelected > 10 && (
                  <li className="text-xs text-muted-foreground">
                    +{totalSelected - 10} more
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
