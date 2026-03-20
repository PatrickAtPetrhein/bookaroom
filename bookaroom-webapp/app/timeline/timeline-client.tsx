"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/app/components/calendar";
import { cn } from "@/lib/utils";
import {
  type AttendanceRow,
  formatHumanDate,
  formatShortDate,
  getWorkdaysForWeek,
  toIsoDate,
} from "@/lib/attendance";
import { createClient } from "@/lib/supabase/client";

type TimelineClientProps = {
  companyId: string;
  startDate: string;
  endDate: string;
  initialRows: AttendanceRow[];
};

function groupByDate(rows: AttendanceRow[]) {
  return rows.reduce<Record<string, AttendanceRow[]>>((acc, row) => {
    const list = acc[row.office_date] ?? [];
    list.push(row);
    acc[row.office_date] = list;
    return acc;
  }, {});
}

function buildTeamCounts(rows: AttendanceRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.office_date, (counts.get(row.office_date) ?? 0) + 1);
  }
  return counts;
}

function getPersonName(entry: AttendanceRow): string {
  if (entry.profiles && entry.profiles.length > 0) {
    return entry.profiles[0].full_name || entry.profiles[0].email;
  }
  return "Unknown";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TimelineClient({
  companyId,
  startDate,
  endDate,
  initialRows,
}: TimelineClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initialRows);
  const todayIso = useMemo(() => toIsoDate(new Date()), []);
  const [activeDay, setActiveDay] = useState(todayIso);
  const [connected, setConnected] = useState(true);

  const refreshTimeline = useCallback(async () => {
    const { data, error } = await supabase
      .from("attendance_days")
      .select("id, office_date, status, user_id, profiles(full_name, email)")
      .eq("company_id", companyId)
      .gte("office_date", startDate)
      .lte("office_date", endDate)
      .order("office_date", { ascending: true });

    if (error) {
      setConnected(false);
      return;
    }

    setRows((data ?? []) as AttendanceRow[]);
    setConnected(true);
  }, [companyId, endDate, startDate, supabase]);

  useEffect(() => {
    const channel = supabase
      .channel(`company-attendance-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_days",
          filter: `company_id=eq.${companyId}`,
        },
        async () => {
          await refreshTimeline();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, refreshTimeline, supabase]);

  const grouped = useMemo(() => groupByDate(rows), [rows]);
  const teamCounts = useMemo(() => buildTeamCounts(rows), [rows]);

  const activeDayPeople = grouped[activeDay] ?? [];
  const todayCount = teamCounts.get(todayIso) ?? 0;

  const thisWeekWorkdays = useMemo(() => getWorkdaysForWeek(0), []);
  const thisWeekStats = useMemo(() => {
    return thisWeekWorkdays.map((iso) => ({
      iso,
      count: teamCounts.get(iso) ?? 0,
    }));
  }, [thisWeekWorkdays, teamCounts]);

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardContent className="pt-6">
          <Calendar
            teamCounts={teamCounts}
            onSelectDay={setActiveDay}
            activeDay={activeDay}
          />
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded bg-primary/[0.04] ring-1 ring-border" />
              Few
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded bg-primary/[0.14] ring-1 ring-border" />
              Some
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-3 rounded bg-primary/[0.22] ring-1 ring-border" />
              Many
            </span>
            {!connected && (
              <span className="ml-auto text-destructive">Reconnecting...</span>
            )}
            {connected && (
              <span className="ml-auto text-emerald-600">Live</span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{todayCount}</p>
                <p className="text-xs text-muted-foreground">in office today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {formatHumanDate(activeDay)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {activeDayPeople.length === 0
                ? "No one scheduled"
                : `${activeDayPeople.length} ${activeDayPeople.length === 1 ? "person" : "people"} in office`}
            </p>
          </CardHeader>
          {activeDayPeople.length > 0 && (
            <CardContent>
              <ul className="space-y-2">
                {activeDayPeople.map((entry) => {
                  const name = getPersonName(entry);
                  const initials = getInitials(name);
                  return (
                    <li key={entry.id} className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {initials}
                      </div>
                      <span className="text-sm">{name}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {thisWeekStats.map((day) => (
                <button
                  key={day.iso}
                  type="button"
                  onClick={() => setActiveDay(day.iso)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors hover:bg-muted",
                    activeDay === day.iso && "bg-muted font-medium",
                  )}
                >
                  <span>{formatShortDate(day.iso)}</span>
                  <Badge
                    variant={day.count > 0 ? "secondary" : "outline"}
                    className="tabular-nums"
                  >
                    {day.count}
                  </Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
