-- CreateTable
CREATE TABLE "DemoUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "aiUses" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "DemoUser_username_key" ON "DemoUser"("username");
