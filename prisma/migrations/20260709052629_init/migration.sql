-- CreateTable
CREATE TABLE "Tender" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cpvCodes" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "score" INTEGER,
    "aiSummary" TEXT,
    "aiDecision" TEXT,
    "aiReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "cpvCodes" TEXT NOT NULL,
    "regions" TEXT NOT NULL,
    "minBudget" REAL NOT NULL,
    "maxBudget" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Tender_externalId_key" ON "Tender"("externalId");
