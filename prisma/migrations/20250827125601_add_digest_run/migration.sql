-- CreateTable
CREATE TABLE "public"."DigestRun" (
    "id" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "env" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alerts" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,

    CONSTRAINT "DigestRun_pkey" PRIMARY KEY ("id")
);
