-- CreateTable
CREATE TABLE "Identity" (
    "address" TEXT NOT NULL PRIMARY KEY,
    "didUri" TEXT NOT NULL,
    "registeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Asset" (
    "tokenId" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ownerDid" TEXT NOT NULL,
    "tokenUri" TEXT NOT NULL,
    "mintedBy" TEXT NOT NULL,
    "mintedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contract" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "args" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_txHash_eventName_key" ON "Event"("txHash", "eventName");
