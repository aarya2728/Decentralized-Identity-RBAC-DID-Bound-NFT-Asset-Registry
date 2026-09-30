import { createPublicClient, http, parseAbiItem } from "viem";
import { sepolia } from "viem/chains";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function setupEventListeners(
  accessControlAddress: `0x${string}`,
  identityRegistryAddress: `0x${string}`,
  assetNftAddress: `0x${string}`,
  rpcUrl?: string
) {
  const client = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl || process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org"),
  });

  console.log("[Indexer] Initializing contract event listeners...");

  // 1. Watch IdentityCreated
  client.watchEvent({
    address: identityRegistryAddress,
    event: parseAbiItem(
      "event IdentityCreated(address indexed user, string didUri, bytes32 pubKeyHash)"
    ),
    onLogs: async (logs) => {
      for (const log of logs) {
        const { user, didUri } = log.args as { user: string; didUri: string };
        console.log(`[Indexer] IdentityCreated: ${user} -> ${didUri}`);

        // Update Identity table
        await prisma.identity.upsert({
          where: { address: user.toLowerCase() },
          update: { didUri },
          create: { address: user.toLowerCase(), didUri },
        });

        // Record Audit Event
        await prisma.event.upsert({
          where: {
            txHash_eventName: {
              txHash: log.transactionHash,
              eventName: "IdentityCreated",
            },
          },
          update: {},
          create: {
            contract: identityRegistryAddress,
            eventName: "IdentityCreated",
            args: JSON.stringify(log.args),
            blockNumber: Number(log.blockNumber),
            txHash: log.transactionHash,
          },
        });
      }
    },
  });

  // 2. Watch AssetAllocated
  client.watchEvent({
    address: assetNftAddress,
    event: parseAbiItem(
      "event AssetAllocated(uint256 indexed tokenId, address indexed from, address indexed to)"
    ),
    onLogs: async (logs) => {
      for (const log of logs) {
        const { tokenId, to } = log.args as { tokenId: bigint; from: string; to: string };
        const id = Number(tokenId);
        console.log(`[Indexer] AssetAllocated: Token #${id} -> ${to}`);

        // Update Asset table
        await prisma.asset.upsert({
          where: { tokenId: id },
          update: { ownerDid: to.toLowerCase() },
          create: {
            tokenId: id,
            ownerDid: to.toLowerCase(),
            tokenUri: "",
            mintedBy: to.toLowerCase(),
          },
        });

        // Record Audit Event
        await prisma.event.upsert({
          where: {
            txHash_eventName: {
              txHash: log.transactionHash,
              eventName: "AssetAllocated",
            },
          },
          update: {},
          create: {
            contract: assetNftAddress,
            eventName: "AssetAllocated",
            args: JSON.stringify(log.args, (_, v) => (typeof v === "bigint" ? v.toString() : v)),
            blockNumber: Number(log.blockNumber),
            txHash: log.transactionHash,
          },
        });
      }
    },
  });

  console.log("[Indexer] Event listeners established successfully.");
}
