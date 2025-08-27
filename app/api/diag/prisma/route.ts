// app/api/diag/prisma/route.ts
export const runtime = "nodejs"; // 🔑 force Node runtime

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  const host =
    (process.env.DATABASE_URL || "").split("@").pop()?.split("/")[0] || "";
  await prisma.$queryRaw`SELECT 1`; // tiny test query
  return new Response(JSON.stringify({ dbHost: host, ok: true }), {
    headers: { "content-type": "application/json" },
  });
}
