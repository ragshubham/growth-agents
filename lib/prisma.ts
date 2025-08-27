// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

// ✅ Guard goes here, before PrismaClient is created
if ((process.env.DATABASE_URL || "").includes("prisma.io")) {
  throw new Error(
    "Bad DATABASE_URL: points to prisma.io (dataproxy). Use Neon URL instead."
  );
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
