-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "digestHourLocal" INTEGER DEFAULT 9,
ADD COLUMN     "minSeverity" TEXT NOT NULL DEFAULT 'OK',
ADD COLUMN     "quietHoursEnd" TEXT DEFAULT '07:00',
ADD COLUMN     "quietHoursStart" TEXT DEFAULT '21:00';
