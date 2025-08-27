// app/api/email/test/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST() {
  try {
    const session = await auth();
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get company info (optional)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { company: { select: { name: true, timezone: true } } },
    });

    const companyName = user?.company?.name || "Your Company";
    const tz = user?.company?.timezone || "Asia/Kolkata";

    const html = `
      <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <h2 style="margin:0 0 8px">✅ Shield Agent — Test Email</h2>
        <p style="margin:0 0 16px;color:#4b5563">If you see this in your inbox, email is wired up.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
        <p style="margin:0 0 6px"><strong>Company</strong>: ${companyName}</p>
        <p style="margin:0 0 6px"><strong>Timezone</strong>: ${tz}</p>
        <p style="margin:0 0 16px"><strong>When</strong>: ${new Date().toLocaleString("en-IN", { timeZone: tz })}</p>
        <p style="color:#6b7280;font-size:12px">Next step: plug in your CSV or ad accounts to receive real digests.</p>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: "Shield Agent <noreply@growthagents.io>",
      to: email,
      subject: "Shield Agent · Test Email",
      html,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Failed" }, { status: 500 });
  }
}
