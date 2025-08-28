// app/api/admin/alerts/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function getBaseUrl(req: Request) {
  // prefer configured base; fallback to incoming host headers
  const cfg = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (cfg) return cfg.replace(/\/$/, "");
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host"))!;
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  // require a logged-in user (keeps it simple)
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.ALERTS_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "ALERTS_SECRET not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1"; // allow ?dry=1 from UI
  const base = getBaseUrl(req);

  const upstream = `${base}/api/alerts${dry ? "?dry=1" : ""}`;
  const r = await fetch(upstream, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    // no body needed; /api/alerts reads from DB and runs multi-tenant
  });

  const body = await r.text();
  try {
    return NextResponse.json(JSON.parse(body), { status: r.status });
  } catch {
    return new NextResponse(body, { status: r.status });
  }
}
