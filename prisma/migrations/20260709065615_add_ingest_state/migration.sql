-- CreateTable
CREATE TABLE "IngestState" (
    "id" TEXT NOT NULL,
    "page" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestState_pkey" PRIMARY KEY ("id")
);
