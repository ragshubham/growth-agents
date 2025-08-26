import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const TO = process.env.RESEND_TO || "you@example.com";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    if (!resend) {
      console.log(`[subscribe] captured: ${email}`);
      return NextResponse.json({ ok: true, mocked: true });
    }

    // Works without domain verification in dev
    await resend.emails.send({
      from: "Growth Agents <onboarding@resend.dev>",
      to: TO,
      subject: "New lead captured",
      text: `Email: ${email}\nSource: landing-page`,
    });

    return NextResponse.json({ ok: true, message: "Subscribed!" });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
