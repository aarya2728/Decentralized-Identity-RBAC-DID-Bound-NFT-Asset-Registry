import {
  createPublicClient,
  decodeEventLog,
  http,
  keccak256,
  parseAbiItem,
  stringToHex,
  type Address,
  type Hex,
  type Log,
} from "viem";
import { prisma } from "../lib/prisma";

const POLL_INTERVAL_MS = 6_000;
const MAX_BLOCK_SPAN = 2_000n;

const identityCreatedEvent = parseAbiItem(
  "event IdentityCreated(address indexed user, string didUri, bytes32 pubKeyHash)"
);
const identityUpdatedEvent = parseAbiItem(
  "event IdentityUpdated(address indexed user, string didUri, bytes32 pubKeyHash)"
);
const identityRevokedEvent = parseAbiItem("event IdentityRevoked(address indexed user)");
const assetAllocatedEvent = parseAbiItem(
  "event AssetAllocated(uint256 indexed tokenId, address indexed from, address indexed to, string fromDid, string toDid)"
);
const roleGrantedEvent = parseAbiItem(
  "event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender)"
);
const roleRevokedEvent = parseAbiItem(
  "event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender)"
);

const assetNftAbi = [
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

function topicOf(signature: string): Hex {
  return keccak256(stringToHex(signature));
}

async function recordEvent(params: {
  contract: string;
  eventName: string;
  args: unknown;
  blockNumber: number;
  txHash: string;
  logIndex: number;
}) {
  await prisma.event.upsert({
    where: {
      txHash_logIndex: { txHash: params.txHash, logIndex: params.logIndex },
    },
    update: {
      eventName: params.eventName,
      args: JSON.stringify(params.args),
      blockNumber: params.blockNumber,
    },
    create: {
      contract: params.contract.toLowerCase(),
      eventName: params.eventName,
      args: JSON.stringify(params.args),
      blockNumber: params.blockNumber,
      txHash: params.txHash,
      logIndex: params.logIndex,
    },
  });
}

export async function setupEventListeners(
  accessControlAddress: Address,
  identityRegistryAddress: Address,
  assetNftAddress: Address,
  rpcUrl?: string
) {
  const rpc = rpcUrl || process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
  const client = createPublicClient({ transport: http(rpc) });

  console.log("[Indexer] polling", rpc);

  const poll = async () => {
    try {
      const chainHead = await client.getBlockNumber();
      const checkpoint = await prisma.indexerCheckpoint.upsert({
        where: { id: "default" },
        update: { chainHead: Number(chainHead) },
        create: { id: "default", lastBlock: 0, chainHead: Number(chainHead) },
      });

      const fromBlock =
        checkpoint.lastBlock > 0 ? BigInt(checkpoint.lastBlock) + 1n : 0n;
      if (fromBlock > chainHead) {
        await prisma.indexerCheckpoint.update({
          where: { id: "default" },
          data: { chainHead: Number(chainHead), lastError: "" },
        });
        return;
      }

      const toBlock =
        fromBlock + MAX_BLOCK_SPAN < chainHead ? fromBlock + MAX_BLOCK_SPAN : chainHead;

      const logs = await client.getLogs({
        address: [identityRegistryAddress, assetNftAddress, accessControlAddress],
        fromBlock,
        toBlock,
      });

      for (const log of logs) {
        await handleLog(client, log, {
          identityRegistryAddress,
          assetNftAddress,
          accessControlAddress,
        });
      }

      await prisma.indexerCheckpoint.update({
        where: { id: "default" },
        data: {
          lastBlock: Number(toBlock),
          chainHead: Number(chainHead),
          lastError: "",
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[Indexer] poll error:", message);
      await prisma.indexerCheckpoint.upsert({
        where: { id: "default" },
        update: { lastError: message },
        create: { id: "default", lastBlock: 0, lastError: message },
      });
    }
  };

  await poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

async function handleLog(
  client: any,
  log: any,
  addrs: {
    identityRegistryAddress: Address;
    assetNftAddress: Address;
    accessControlAddress: Address;
  }
) {
  const topic0 = log.topics[0];
  if (!topic0 || log.blockNumber === null || !log.transactionHash) return;

  const blockNumber = Number(log.blockNumber);
  const txHash = log.transactionHash;
  const logIndex = log.logIndex ?? 0;
  const address = (log.address || "").toLowerCase();

  if (topic0 === topicOf("IdentityCreated(address,string,bytes32)")) {
    const decoded = decodeEventLog({
      abi: [identityCreatedEvent],
      data: log.data,
      topics: log.topics,
    });
    const args = (decoded as any).args as { user: Address; didUri: string; pubKeyHash: Hex };
    const user = args.user.toLowerCase();
    await prisma.identity.upsert({
      where: { address: user },
      update: { didUri: args.didUri, pubKeyHash: args.pubKeyHash, revoked: false },
      create: {
        address: user,
        didUri: args.didUri,
        pubKeyHash: args.pubKeyHash,
        revoked: false,
      },
    });
    await recordEvent({
      contract: address,
      eventName: "IdentityCreated",
      args: { user, didUri: args.didUri, pubKeyHash: args.pubKeyHash },
      blockNumber,
      txHash,
      logIndex,
    });
    return;
  }

  if (topic0 === topicOf("IdentityUpdated(address,string,bytes32)")) {
    const decoded = decodeEventLog({
      abi: [identityUpdatedEvent],
      data: log.data,
      topics: log.topics,
    });
    const args = (decoded as any).args as { user: Address; didUri: string; pubKeyHash: Hex };
    const user = args.user.toLowerCase();
    await prisma.identity.upsert({
      where: { address: user },
      update: { didUri: args.didUri, pubKeyHash: args.pubKeyHash, revoked: false },
      create: {
        address: user,
        didUri: args.didUri,
        pubKeyHash: args.pubKeyHash,
        revoked: false,
      },
    });
    await recordEvent({
      contract: address,
      eventName: "IdentityUpdated",
      args: { user, didUri: args.didUri, pubKeyHash: args.pubKeyHash },
      blockNumber,
      txHash,
      logIndex,
    });
    return;
  }

  if (topic0 === topicOf("IdentityRevoked(address)")) {
    const decoded = decodeEventLog({
      abi: [identityRevokedEvent],
      data: log.data,
      topics: log.topics,
    });
    const args = (decoded as any).args as { user: Address };
    const user = args.user.toLowerCase();
    await prisma.identity.updateMany({
      where: { address: user },
      data: { revoked: true },
    });
    await recordEvent({
      contract: address,
      eventName: "IdentityRevoked",
      args: { user },
      blockNumber,
      txHash,
      logIndex,
    });
    return;
  }

  if (topic0 === topicOf("AssetAllocated(uint256,address,address,string,string)")) {
    const decoded = decodeEventLog({
      abi: [assetAllocatedEvent],
      data: log.data,
      topics: log.topics,
    });
    const args = (decoded as any).args as {
      tokenId: bigint;
      from: Address;
      to: Address;
      fromDid: string;
      toDid: string;
    };
    const tokenId = Number(args.tokenId);
    const from = args.from.toLowerCase();
    const to = args.to.toLowerCase();
    const isMint = from === "0x0000000000000000000000000000000000000000";
    const isBurn = to === "0x0000000000000000000000000000000000000000";

    let tokenUri = "";
    if (!isBurn) {
      try {
        tokenUri = (await (client as any).readContract({
          address: addrs.assetNftAddress,
          abi: assetNftAbi,
          functionName: "tokenURI",
          args: [args.tokenId],
        })) as string;
      } catch {
        tokenUri = "";
      }
    }

    if (isBurn) {
      await prisma.asset.deleteMany({ where: { tokenId } });
    } else {
      const existing = await prisma.asset.findUnique({ where: { tokenId } });
      await prisma.asset.upsert({
        where: { tokenId },
        update: {
          ownerAddress: to,
          ownerDid: args.toDid,
          ...(tokenUri ? { tokenUri } : {}),
        },
        create: {
          tokenId,
          ownerAddress: to,
          ownerDid: args.toDid,
          tokenUri,
          mintedBy: isMint ? to : existing?.mintedBy || to,
        },
      });
    }

    await recordEvent({
      contract: address,
      eventName: "AssetAllocated",
      args: { tokenId, from, to, fromDid: args.fromDid, toDid: args.toDid },
      blockNumber,
      txHash,
      logIndex,
    });
    return;
  }

  if (topic0 === topicOf("RoleGranted(bytes32,address,address)")) {
    const decoded = decodeEventLog({
      abi: [roleGrantedEvent],
      data: log.data,
      topics: log.topics,
    });
    const args = (decoded as any).args as { role: Hex; account: Address; sender: Address };
    await recordEvent({
      contract: address,
      eventName: "RoleGranted",
      args: {
        role: args.role,
        account: args.account.toLowerCase(),
        sender: args.sender.toLowerCase(),
      },
      blockNumber,
      txHash,
      logIndex,
    });
    return;
  }

  if (topic0 === topicOf("RoleRevoked(bytes32,address,address)")) {
    const decoded = decodeEventLog({
      abi: [roleRevokedEvent],
      data: log.data,
      topics: log.topics,
    });
    const args = (decoded as any).args as { role: Hex; account: Address; sender: Address };
    await recordEvent({
      contract: address,
      eventName: "RoleRevoked",
      args: {
        role: args.role,
        account: args.account.toLowerCase(),
        sender: args.sender.toLowerCase(),
      },
      blockNumber,
      txHash,
      logIndex,
    });
  }
}
