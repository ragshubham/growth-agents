// lib/time.ts
export function nowInTz(tz?: string) {
  const d = new Date();
  return new Date(d.toLocaleString("en-US", { timeZone: tz || "UTC" }));
}
export function getHHMM(date: Date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
export function isWithinQuietHours(nowHHMM: string, start?: string | null, end?: string | null) {
  if (!start || !end) return false;
  const toMin = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const n = toMin(nowHHMM);
  const s = toMin(start);
  const e = toMin(end);
  // handles windows that cross midnight (e.g., 21:00–07:00)
  if (s <= e) return n >= s && n < e;
  return n >= s || n < e;
}
