-- AlterTable
ALTER TABLE "IngestState" ADD COLUMN     "tedPage" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Tender" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'ezamowienia';
