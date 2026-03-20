"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, formatHumanDate, toIsoDate } from "@/lib/attendance";
import { createClient } from "@/lib/supabase/client";

type ScheduleClientProps = {
  userId: string;
  companyId: string;
  initialDates: string[];
};

export function ScheduleClient({ userId, companyId, initialDates }: ScheduleClientProps) {
  const supabase = useMemo(() => createClient(), []);
  const [selectedDates, setSelectedDates] = useState(new Set(initialDates));
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, index) => {
      const date = addDays(today, index);
      const iso = toIsoDate(date);
      return {
        iso,
        human: formatHumanDate(iso),
      };
    });
  }, []);

  async function toggleDate(officeDate: string) {
    const nextSelected = new Set(selectedDates);
    const isSelected = nextSelected.has(officeDate);

    if (isSelected) {
      nextSelected.delete(officeDate);
    } else {
      nextSelected.add(officeDate);
    }

    setSelectedDates(nextSelected);
    setIsSaving(true);
    setFeedback(null);

    if (isSelected) {
      const { error } = await supabase
        .from("attendance_days")
        .delete()
        .eq("user_id", userId)
        .eq("office_date", officeDate);

      if (error) {
        setSelectedDates(new Set(selectedDates));
        setFeedback(error.message);
      } else {
        setFeedback(`Removed ${officeDate} from your office schedule.`);
      }
    } else {
      const { error } = await supabase.from("attendance_days").upsert(
        {
          user_id: userId,
          company_id: companyId,
          office_date: officeDate,
          status: "in_office",
        },
        {
          onConflict: "user_id,office_date",
        },
      );

      if (error) {
        setSelectedDates(new Set(selectedDates));
        setFeedback(error.message);
      } else {
        setFeedback(`Added ${officeDate} to your office schedule.`);
      }
    }

    setIsSaving(false);
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Pick your office days</CardTitle>
        <p className="text-sm text-muted-foreground">
          Toggle the next 30 days. Everyone in your company can see these selections on the timeline.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {dates.map((date) => {
            const checked = selectedDates.has(date.iso);
            return (
              <li key={date.iso} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{date.human}</p>
                  <p className="text-xs text-muted-foreground">{date.iso}</p>
                  {checked ? (
                    <Badge variant="secondary" className="w-fit">
                      In office
                    </Badge>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant={checked ? "secondary" : "default"}
                  onClick={() => toggleDate(date.iso)}
                >
                  {checked ? "Remove" : "Set in office"}
                </Button>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 text-sm text-muted-foreground">
          {isSaving ? "Saving..." : feedback ?? "No unsaved changes."}
        </p>
      </CardContent>
    </Card>
  );
}
