-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cpvCodes" TEXT NOT NULL,
    "region" TEXT,
    "publicationDate" TIMESTAMP(3),
    "url" TEXT NOT NULL,
    "score" INTEGER,
    "aiSummary" TEXT,
    "aiDecision" TEXT,
    "aiReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoUser" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "aiUses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DemoUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "cpvCodes" TEXT NOT NULL,
    "regions" TEXT NOT NULL,
    "minBudget" DOUBLE PRECISION NOT NULL,
    "maxBudget" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tender_externalId_key" ON "Tender"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoUser_username_key" ON "DemoUser"("username");
