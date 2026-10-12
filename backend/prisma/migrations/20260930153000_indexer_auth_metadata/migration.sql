-- AlterTable
ALTER TABLE "Identity" ADD COLUMN "pubKeyHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Identity" ADD COLUMN "revoked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "ownerAddress" TEXT NOT NULL DEFAULT '';

CREATE TABLE "Event_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contract" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "args" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "txHash" TEXT NOT NULL,
    "logIndex" INTEGER NOT NULL DEFAULT 0,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "Event_new" ("id", "contract", "eventName", "args", "blockNumber", "txHash", "logIndex", "timestamp")
SELECT "id", "contract", "eventName", "args", "blockNumber", "txHash", 0, "timestamp" FROM "Event";

DROP TABLE "Event";
ALTER TABLE "Event_new" RENAME TO "Event";
CREATE UNIQUE INDEX "Event_txHash_logIndex_key" ON "Event"("txHash", "logIndex");

CREATE TABLE "MetadataPin" (
    "cid" TEXT NOT NULL PRIMARY KEY,
    "ipfsUri" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "pinnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "IndexerCheckpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lastBlock" INTEGER NOT NULL DEFAULT 0,
    "chainHead" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
