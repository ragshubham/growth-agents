-- CreateTable
CREATE TABLE "public"."CronRun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "runDate" TIMESTAMP(3) NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "posted" BOOLEAN NOT NULL,
    "spend" DECIMAL(12,2),
    "cap" DECIMAL(12,2),
    "errorJson" TEXT,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CronRun_companyId_runDate_idx" ON "public"."CronRun"("companyId", "runDate");

-- CreateIndex
CREATE UNIQUE INDEX "CronRun_companyId_runDate_source_key" ON "public"."CronRun"("companyId", "runDate", "source");

-- AddForeignKey
ALTER TABLE "public"."CronRun" ADD CONSTRAINT "CronRun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
