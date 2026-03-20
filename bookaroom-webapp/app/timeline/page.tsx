"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/app/components/app-header";
import { TimelineClient } from "@/app/timeline/timeline-client";
import { addDays, type AttendanceRow, toIsoDate } from "@/lib/attendance";
import { getOrCreateProfile, type Profile } from "@/lib/auth-client";
import { createClient } from "@/lib/supabase/client";

export default function TimelinePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [status, setStatus] = useState("Loading company timeline...");
  const startDate = useMemo(() => toIsoDate(new Date()), []);
  const endDate = useMemo(() => toIsoDate(addDays(new Date(), 29)), []);

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

        if (error) {
          setStatus(`Unable to load timeline: ${error.message}`);
          return;
        }

        setRows((data ?? []) as AttendanceRow[]);
        setStatus("Timeline loaded.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to load timeline.";
        setStatus(message);
      }
    }

    void loadTimeline();
  }, [endDate, router, startDate, supabase]);

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
      <AppHeader activePath="/timeline" userLabel={profile.full_name} />
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-semibold">Company Timeline</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everyone can see who is in the office each day over the next 30 days.
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
