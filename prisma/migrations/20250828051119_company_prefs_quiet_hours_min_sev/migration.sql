-- AlterTable
ALTER TABLE "public"."Company" ALTER COLUMN "name" DROP NOT NULL,
ALTER COLUMN "timezone" DROP NOT NULL,
ALTER COLUMN "timezone" SET DEFAULT 'Asia/Kolkata';
