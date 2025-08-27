// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// Detect real request runtime vs build time (NEXT_RUNTIME is only set at runtime)
const isRuntime = Boolean(process.env.NEXT_RUNTIME);
const dbUrl = process.env.DATABASE_URL || "";

if (dbUrl.includes("prisma.io")) {
  if (isRuntime) {
    throw new Error(
      "Bad DATABASE_URL: points to prisma.io (dataproxy). Use Neon URL instead."
    );
  } else {
    console.warn(
      "WARN: Build-time DATABASE_URL points to prisma.io. Make sure Neon URLs are set for all Vercel scopes."
    );
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
