-- CreateTable
CREATE TABLE "public"."DeliveryLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "email" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT,
    "env" TEXT NOT NULL,
    "dry" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."DeliveryLog" ADD CONSTRAINT "DeliveryLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
