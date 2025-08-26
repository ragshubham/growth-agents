// app/api/alerts/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Severity = "good" | "warn" | "info";
type Alert = { id: string; text: string; severity: Severity };

function parseCsv(text: string): Array<Record<string, string>> {
  // tiny CSV parser for simple, comma-only rows (no quoted commas)
  const [headerLine, ...rows] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(",").map(h => h.trim());
  return rows
    .map(r => r.split(","))
    .filter(cols => cols.length === headers.length)
    .map(cols => Object.fromEntries(cols.map((c, i) => [headers[i], c.trim()])));
}

export async function GET() {
  const url = process.env.SHEET_CSV_URL;
  if (!url) {
    // fallback to your older mock if env missing
    const alerts: Alert[] = [
      { id: "overlap", text: "Audience overlap rising (brand vs. remarketing)", severity: "warn" },
      { id: "fatigue", text: "Creative fatigue detected in Set B", severity: "warn" },
      { id: "cpc",     text: "CPC increasing on Google Brand", severity: "info" },
      { id: "ctr",     text: "Prospecting CTR improving on Meta", severity: "good" },
    ];
    return NextResponse.json({ alerts, updatedAt: new Date().toISOString(), source: "mock" }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) throw new Error(`sheet fetch failed: ${resp.status}`);
    const csv = await resp.text();
    const rows = parseCsv(csv);

    const valid: Alert[] = [];
    let latest = 0;

    for (const r of rows) {
      const id = (r.id || "").trim();
      const text = (r.text || "").trim();
      const severity = (r.severity || "").trim() as Severity;
      if (!id || !text || !["good", "warn", "info"].includes(severity)) continue;

      const ts = Date.parse((r.updatedAt || "").trim());
      if (!Number.isNaN(ts)) latest = Math.max(latest, ts);

      valid.push({ id, text, severity });
    }

    const updatedAt = latest ? new Date(latest).toISOString() : new Date().toISOString();

    return NextResponse.json(
      { alerts: valid, updatedAt, source: "sheet" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    // graceful fallback on error
    return NextResponse.json(
      { ok: false, error: e?.message || "sheet error" },
      { status: 500 }
    );
  }
}
