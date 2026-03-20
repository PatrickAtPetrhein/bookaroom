"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AttendanceRow, formatHumanDate } from "@/lib/attendance";
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

export function TimelineClient({ companyId, startDate, endDate, initialRows }: TimelineClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState(initialRows);
  const [status, setStatus] = useState("Live updates connected.");

  const refreshTimeline = useCallback(async () => {
    const { data, error } = await supabase
      .from("attendance_days")
      .select("id, office_date, status, user_id, profiles(full_name, email)")
      .eq("company_id", companyId)
      .gte("office_date", startDate)
      .lte("office_date", endDate)
      .order("office_date", { ascending: true });

    if (error) {
      setStatus(`Refresh failed: ${error.message}`);
      return;
    }

    setRows((data ?? []) as AttendanceRow[]);
    setStatus("Timeline updated.");
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

  const grouped = groupByDate(rows);
  const sortedDates = Object.keys(grouped).sort();

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Next 30 days</CardTitle>
        <p className="text-sm text-muted-foreground">{status}</p>
      </CardHeader>
      <CardContent>
        {sortedDates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attendance entries yet for this time window.</p>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => (
              <div key={date} className="rounded-lg border p-3">
                <h3 className="text-sm font-semibold">{formatHumanDate(date)}</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {grouped[date].map((entry) => (
                    <li key={entry.id} className="flex items-center justify-between">
                      <span>
                        {entry.profiles?.[0]?.full_name ??
                          entry.profiles?.[0]?.email ??
                          "Unknown employee"}
                      </span>
                      <Badge variant="secondary">In office</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
