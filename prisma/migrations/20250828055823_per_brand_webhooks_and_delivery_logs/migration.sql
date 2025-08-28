-- AlterTable
ALTER TABLE "public"."Company" ADD COLUMN     "brandWebhookUrls" JSONB,
ADD COLUMN     "summaryWebhookUrl" TEXT;
