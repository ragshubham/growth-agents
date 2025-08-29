import { NextResponse } from "next/server";

export async function GET() {
  try {
    const token = process.env.META_ACCESS_TOKEN!;
    const adAccountId = process.env.META_AD_ACCOUNT_ID!;

    const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?fields=campaign_name,spend,impressions,clicks&date_preset=last_7d&access_token=${token}`;

    const resp = await fetch(url);
    const data = await resp.json();

    // Handle empty data gracefully
    if (!data || !data.data || data.data.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No spend data yet. Campaigns may still be in review or haven’t delivered.",
        data: []
      });
    }

    return NextResponse.json({ ok: true, data: data.data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to fetch spend" },
      { status: 500 }
    );
  }
}
