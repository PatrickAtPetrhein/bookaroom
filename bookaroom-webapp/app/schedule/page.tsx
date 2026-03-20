"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { ScheduleClient } from "@/app/schedule/schedule-client";
import { addDays, toIsoDate } from "@/lib/attendance";
import { getOrCreateProfile, type Profile } from "@/lib/auth-client";
import { createClient } from "@/lib/supabase/client";

export default function SchedulePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initialDates, setInitialDates] = useState<string[]>([]);
  const [status, setStatus] = useState("Loading your schedule...");

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
        setProfile(nextProfile);

        const startDate = toIsoDate(new Date());
        const endDate = toIsoDate(addDays(new Date(), 29));
        const { data, error } = await supabase
          .from("attendance_days")
          .select("office_date")
          .eq("user_id", nextProfile.id)
          .gte("office_date", startDate)
          .lte("office_date", endDate)
          .order("office_date", { ascending: true });

        if (error) {
          setStatus(`Unable to load schedule: ${error.message}`);
          return;
        }

        setInitialDates((data ?? []).map((entry) => entry.office_date));
        setStatus("Schedule loaded.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load schedule.";
        setStatus(message);
      }
    }

    void loadSchedule();
  }, [router, supabase]);

  if (!profile) {
    return (
      <main className="min-h-screen bg-muted/30">
        <div className="mx-auto w-full max-w-5xl px-4 py-10">
          <p className="text-sm text-muted-foreground">{status}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30">
      <AppHeader activePath="/schedule" userLabel={profile.full_name} />
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold">My Schedule</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Decide which days you are coming into the office. Updates appear on the company timeline in real time.
        </p>
        <ScheduleClient userId={profile.id} companyId={profile.company_id} initialDates={initialDates} />
      </div>
    </main>
  );
}
