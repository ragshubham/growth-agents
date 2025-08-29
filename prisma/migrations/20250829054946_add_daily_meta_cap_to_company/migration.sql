-- DropIndex
DROP INDEX "public"."Company_name_idx";

-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "dailyMetaCap" INTEGER DEFAULT 0;
