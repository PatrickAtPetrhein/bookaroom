"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { ScheduleClient } from "@/app/schedule/schedule-client";
import { toIsoDate } from "@/lib/attendance";
import { getOrCreateProfile, type Profile } from "@/lib/auth-client";
import { createClient } from "@/lib/supabase/client";

export default function SchedulePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initialDates, setInitialDates] = useState<string[]>([]);
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function loadSchedule() {
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

        const today = new Date();
        const startDate = toIsoDate(today);
        const endDate = toIsoDate(
          new Date(today.getFullYear(), today.getMonth() + 4, 0),
        );

        const [userResult, teamResult] = await Promise.all([
          supabase
            .from("attendance_days")
            .select("office_date")
            .eq("user_id", nextProfile.id)
            .gte("office_date", startDate)
            .lte("office_date", endDate)
            .order("office_date", { ascending: true }),
          supabase
            .from("attendance_days")
            .select("office_date")
            .eq("company_id", nextProfile.company_id)
            .gte("office_date", startDate)
            .lte("office_date", endDate),
        ]);

        const dates = !userResult.error
          ? (userResult.data ?? []).map((e) => e.office_date)
          : [];

        const counts: Record<string, number> = {};
        if (!teamResult.error) {
          for (const row of teamResult.data ?? []) {
            counts[row.office_date] = (counts[row.office_date] ?? 0) + 1;
          }
        }

        setInitialDates(dates);
        setTeamCounts(counts);
        setProfile(nextProfile);
        setReady(true);
      } catch {
        // auth or profile bootstrap failure — stay on loading state
      }
    }

    void loadSchedule();
  }, [router, supabase]);

  if (!profile || !ready) {
    return (
      <main className="min-h-screen bg-muted/30">
        <div className="h-14 border-b bg-card/80" />
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
          <div className="animate-pulse space-y-6">
            <div>
              <div className="h-7 w-40 rounded bg-muted" />
              <div className="mt-2 h-4 w-72 rounded bg-muted" />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
              <div className="h-[420px] rounded-xl bg-card ring-1 ring-foreground/5" />
              <div className="space-y-4">
                <div className="h-20 rounded-xl bg-card ring-1 ring-foreground/5" />
                <div className="h-36 rounded-xl bg-card ring-1 ring-foreground/5" />
                <div className="h-36 rounded-xl bg-card ring-1 ring-foreground/5" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <AppHeader activePath="/schedule" userLabel={profile.full_name} />
      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">My Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Click days on the calendar to plan when you&apos;re coming into the office.
        </p>
        <ScheduleClient
          userId={profile.id}
          companyId={profile.company_id}
          initialDates={initialDates}
          initialTeamCounts={teamCounts}
        />
      </div>
    </main>
  );
}
