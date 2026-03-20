"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { TimelineClient } from "@/app/timeline/timeline-client";
import { type AttendanceRow, toIsoDate } from "@/lib/attendance";
import { getOrCreateProfile, type Profile } from "@/lib/auth-client";
import { createClient } from "@/lib/supabase/client";

export default function TimelinePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);

  const startDate = useMemo(() => toIsoDate(new Date()), []);
  const endDate = useMemo(() => {
    const now = new Date();
    return toIsoDate(new Date(now.getFullYear(), now.getMonth() + 4, 0));
  }, []);

  useEffect(() => {
    async function loadTimeline() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      try {
        const nextProfile = await getOrCreateProfile(user);
        setProfile(nextProfile);

        const { data, error } = await supabase
          .from("attendance_days")
          .select("id, office_date, status, user_id, profiles(full_name, email)")
          .eq("company_id", nextProfile.company_id)
          .gte("office_date", startDate)
          .lte("office_date", endDate)
          .order("office_date", { ascending: true });

        if (error) return;
        setRows((data ?? []) as AttendanceRow[]);
      } catch {
        // auth or profile bootstrap failure
      }
    }

    void loadTimeline();
  }, [endDate, router, startDate, supabase]);

  if (!profile) {
    return (
      <main className="min-h-screen bg-muted/30">
        <div className="h-14 border-b bg-card/80" />
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div>
              <div className="h-7 w-48 rounded bg-muted" />
              <div className="mt-2 h-4 w-80 rounded bg-muted" />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
              <div className="h-[420px] rounded-xl bg-card ring-1 ring-foreground/5" />
              <div className="space-y-4">
                <div className="h-20 rounded-xl bg-card ring-1 ring-foreground/5" />
                <div className="h-48 rounded-xl bg-card ring-1 ring-foreground/5" />
                <div className="h-48 rounded-xl bg-card ring-1 ring-foreground/5" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <AppHeader activePath="/timeline" userLabel={profile.full_name} />
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Company Timeline
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          See who&apos;s in the office. Click any day on the calendar for details.
        </p>
        <TimelineClient
          companyId={profile.company_id}
          startDate={startDate}
          endDate={endDate}
          initialRows={rows}
        />
      </div>
    </main>
  );
}
