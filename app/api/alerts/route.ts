// app/api/alerts/route.ts
export const dynamic = 'force-dynamic'; // don't cache in dev

type Severity = 'good' | 'warn' | 'info';
type Alert = { id: string; text: string; severity: Severity };

export async function GET() {
  const alerts: Alert[] = [
    { id: 'overlap', text: 'Audience overlap rising (brand vs. remarketing)', severity: 'warn' },
    { id: 'fatigue', text: 'Creative fatigue detected in Set B', severity: 'warn' },
    { id: 'cpc',     text: 'CPC increasing on Google Brand', severity: 'info' },
    { id: 'ctr',     text: 'Prospecting CTR improving on Meta', severity: 'good' },
  ];

  return Response.json({
    updatedAt: new Date().toISOString(),
    alerts,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
