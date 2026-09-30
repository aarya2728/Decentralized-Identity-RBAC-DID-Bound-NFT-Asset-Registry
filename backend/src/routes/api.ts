import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// In-memory IPFS pin mock / store (can be wired to Pinata / web3.storage API keys via env)
const ipfsStore = new Map<string, Record<string, unknown>>();

export async function apiRoutes(server: FastifyInstance, options: FastifyPluginOptions) {
  // GET /identities/:address
  server.get("/identities/:address", async (request, reply) => {
    const { address } = request.params as { address: string };
    const identity = await prisma.identity.findUnique({
      where: { address: address.toLowerCase() },
    });

    if (!identity) {
      return reply.status(404).send({ error: "Identity not found" });
    }

    return reply.send(identity);
  });

  // GET /assets/:tokenId
  server.get("/assets/:tokenId", async (request, reply) => {
    const { tokenId } = request.params as { tokenId: string };
    const id = parseInt(tokenId, 10);
    const asset = await prisma.asset.findUnique({
      where: { tokenId: id },
    });

    if (!asset) {
      return reply.status(404).send({ error: "Asset not found" });
    }

    // Attach off-chain metadata if pinned in IPFS store
    const metadata = ipfsStore.get(asset.tokenUri) || {};

    return reply.send({
      ...asset,
      metadata,
    });
  });

  // GET /assets/:tokenId/history
  server.get("/assets/:tokenId/history", async (request, reply) => {
    const { tokenId } = request.params as { tokenId: string };
    const events = await prisma.event.findMany({
      where: {
        eventName: "AssetAllocated",
      },
      orderBy: { blockNumber: "asc" },
    });

    const filtered = events.filter((e) => {
      try {
        const parsed = JSON.parse(e.args);
        return parsed.tokenId === tokenId || parsed.tokenId === Number(tokenId);
      } catch {
        return false;
      }
    });

    return reply.send({ tokenId: Number(tokenId), history: filtered });
  });

  // GET /audit
  server.get("/audit", async (request, reply) => {
    const events = await prisma.event.findMany({
      orderBy: { timestamp: "desc" },
      take: 100,
    });

    return reply.send({
      total: events.length,
      events: events.map((e) => ({
        ...e,
        args: JSON.parse(e.args),
      })),
    });
  });

  // POST /metadata/pin
  server.post("/metadata/pin", async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    if (!body || Object.keys(body).length === 0) {
      return reply.status(400).send({ error: "Metadata payload required" });
    }

    // Compute deterministic CID mock or pin to IPFS
    const hash = crypto.createHash("sha256").update(JSON.stringify(body)).digest("hex");
    const cid = `bafybeig${hash.substring(0, 32)}`;
    const ipfsUri = `ipfs://${cid}/metadata.json`;

    ipfsStore.set(ipfsUri, body);

    return reply.send({
      cid,
      ipfsUri,
      pinnedAt: new Date().toISOString(),
    });
  });
}
