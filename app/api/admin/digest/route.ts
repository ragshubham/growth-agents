// app/api/admin/digest/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function getBaseUrl(req: Request) {
  const cfg = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (cfg) return cfg.replace(/\/$/, "");
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host"))!;
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const url = new URL(req.url);
  const dry = url.searchParams.get("dry") === "1";
  const base = getBaseUrl(req);

  const upstream = `${base}/api/cron/digest${dry ? "?dry=1" : ""}`;
  const r = await fetch(upstream, {
    method: "GET", // your digest route uses GET
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await r.text();
  try {
    return NextResponse.json(JSON.parse(body), { status: r.status });
  } catch {
    return new NextResponse(body, { status: r.status });
  }
}
