-- CreateTable
CREATE TABLE "public"."Brand" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Connection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "profileJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdAccount" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT,
    "connectedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Brand_companyId_idx" ON "public"."Brand"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_companyId_name_key" ON "public"."Brand"("companyId", "name");

-- CreateIndex
CREATE INDEX "Connection_userId_idx" ON "public"."Connection"("userId");

-- CreateIndex
CREATE INDEX "Connection_provider_idx" ON "public"."Connection"("provider");

-- CreateIndex
CREATE INDEX "AdAccount_brandId_idx" ON "public"."AdAccount"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "AdAccount_provider_externalId_key" ON "public"."AdAccount"("provider", "externalId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE INDEX "Company_name_idx" ON "public"."Company"("name");

-- CreateIndex
CREATE INDEX "DeliveryLog_companyId_createdAt_idx" ON "public"."DeliveryLog"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- AddForeignKey
ALTER TABLE "public"."Brand" ADD CONSTRAINT "Brand_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Connection" ADD CONSTRAINT "Connection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdAccount" ADD CONSTRAINT "AdAccount_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdAccount" ADD CONSTRAINT "AdAccount_connectedBy_fkey" FOREIGN KEY ("connectedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
