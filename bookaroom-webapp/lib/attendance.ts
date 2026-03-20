export type ProfileEmbed = {
  full_name: string;
  email: string;
};

export type AttendanceRow = {
  id: string;
  office_date: string;
  status: "in_office";
  user_id: string;
  profiles: ProfileEmbed | ProfileEmbed[] | null;
};

export function resolveProfile(row: AttendanceRow): ProfileEmbed | null {
  if (!row.profiles) return null;
  if (Array.isArray(row.profiles)) return row.profiles[0] ?? null;
  return row.profiles;
}

export function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(base: Date, days: number) {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

export function formatHumanDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getWorkdaysForWeek(weekOffset: number): string[] {
  const monday = getWeekStart(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toIsoDate(d);
  });
}
