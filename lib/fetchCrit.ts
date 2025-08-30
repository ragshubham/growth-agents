// lib/fetchCrit.ts
export async function fetchCrit() {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    'https://www.growthagents.io';

  const res = await fetch(`${base}/api/dashboard/crit`, {
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`crit fetch failed: ${res.status}`);

  return res.json() as Promise<{
    ok: boolean;
    yesterday: { ymd: string; crit: boolean };
    counts: { critLast14: number };
    series: Array<{ ymd: string; crit: boolean; reason: string[] }>;
  }>;
}
