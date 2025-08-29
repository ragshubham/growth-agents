// lib/date.ts
export function localYMD(timezone: string): { date: Date; ymd: string } {
  const tz = timezone || 'Asia/Kolkata';
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()); // e.g. "2025-08-29"
  // Store runDate as the local business day bucket. Using UTC midnight is fine for bucketing.
  const date = new Date(`${ymd}T00:00:00.000Z`);
  return { date, ymd };
}
