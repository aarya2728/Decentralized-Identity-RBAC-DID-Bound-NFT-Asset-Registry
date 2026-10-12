import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { hasAnyAppRole, type JwtUser } from "../lib/roles";

function jwtUser(request: FastifyRequest): JwtUser | null {
  const user = request.user as JwtUser | undefined;
  if (!user?.address) return null;
  return user;
}

async function requireRoles(
  request: FastifyRequest,
  reply: FastifyReply,
  allowed: Array<"ADMIN" | "MANAGER" | "AUDITOR" | "USER">
) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ error: "Sign in with EIP-712 to access this endpoint" });
    return false;
  }
  const user = jwtUser(request);
  if (!user || !hasAnyAppRole(user.roles, allowed)) {
    reply.status(403).send({
      error: `Requires one of: ${allowed.join(", ")}`,
      roles: user?.roles || [],
    });
    return false;
  }
  return true;
}

export async function apiRoutes(server: FastifyInstance) {
  server.get("/indexer/status", async (_request, reply) => {
    const checkpoint = await prisma.indexerCheckpoint.findUnique({ where: { id: "default" } });
    const lag = checkpoint ? Math.max(0, checkpoint.chainHead - checkpoint.lastBlock) : null;
    return reply.send({
      lastBlock: checkpoint?.lastBlock ?? 0,
      chainHead: checkpoint?.chainHead ?? 0,
      lag,
      lastError: checkpoint?.lastError || null,
      healthy: Boolean(checkpoint && !checkpoint.lastError),
    });
  });

  server.get("/identities/:address", async (request: FastifyRequest, reply: FastifyReply) => {
    const { address } = request.params as { address: string };
    const identity = await prisma.identity.findUnique({
      where: { address: address.toLowerCase() },
    });
    if (!identity) {
      return reply.status(404).send({ error: "Identity not found" });
    }
    return reply.send(identity);
  });

  server.get("/assets", async (_request, reply) => {
    const assets = await prisma.asset.findMany({ orderBy: { tokenId: "desc" } });
    const withMeta = await Promise.all(
      assets.map(async (asset) => {
        const pin = await prisma.metadataPin.findFirst({
          where: { OR: [{ ipfsUri: asset.tokenUri }, { cid: asset.tokenUri.replace("ipfs://", "").split("/")[0] }] },
        });
        return {
          ...asset,
          metadata: pin ? JSON.parse(pin.payload) : {},
        };
      })
    );
    return reply.send({ assets: withMeta });
  });

  server.get("/assets/:tokenId", async (request: FastifyRequest, reply: FastifyReply) => {
    const { tokenId } = request.params as { tokenId: string };
    const id = parseInt(tokenId, 10);
    const asset = await prisma.asset.findUnique({ where: { tokenId: id } });
    if (!asset) {
      return reply.status(404).send({ error: "Asset not found" });
    }
    const pin = await prisma.metadataPin.findFirst({
      where: { OR: [{ ipfsUri: asset.tokenUri }, { cid: asset.tokenUri.replace("ipfs://", "").split("/")[0] }] },
    });
    return reply.send({
      ...asset,
      metadata: pin ? JSON.parse(pin.payload) : {},
    });
  });

  server.get("/assets/:tokenId/history", async (request: FastifyRequest, reply: FastifyReply) => {
    const { tokenId } = request.params as { tokenId: string };
    const events = await prisma.event.findMany({
      where: { eventName: "AssetAllocated" },
      orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
    });

    const history = events.filter((e) => {
      try {
        const parsed = JSON.parse(e.args) as { tokenId?: number };
        return Number(parsed.tokenId) === Number(tokenId);
      } catch {
        return false;
      }
    });

    return reply.send({
      tokenId: Number(tokenId),
      history: history.map((e) => ({
        ...e,
        args: JSON.parse(e.args),
      })),
    });
  });

  server.get("/audit", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await requireRoles(request, reply, ["AUDITOR", "ADMIN"]))) return;

    const events = await prisma.event.findMany({
      orderBy: [{ blockNumber: "desc" }, { logIndex: "desc" }],
      take: 200,
    });

    const checkpoint = await prisma.indexerCheckpoint.findUnique({ where: { id: "default" } });

    return reply.send({
      total: events.length,
      indexer: {
        lastBlock: checkpoint?.lastBlock ?? 0,
        chainHead: checkpoint?.chainHead ?? 0,
        lag: checkpoint ? Math.max(0, checkpoint.chainHead - checkpoint.lastBlock) : null,
        lastError: checkpoint?.lastError || null,
      },
      events: events.map((e) => ({
        ...e,
        args: JSON.parse(e.args),
      })),
    });
  });

  server.post("/metadata/pin", async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(await requireRoles(request, reply, ["MANAGER", "ADMIN", "USER"]))) return;

    const body = request.body as Record<string, unknown>;
    if (!body || Object.keys(body).length === 0) {
      return reply.status(400).send({ error: "Metadata payload required" });
    }

    const canonical = JSON.stringify(body);
    const hash = crypto.createHash("sha256").update(canonical).digest("hex");
    let cid = hash;
    let ipfsUri = `ipfs://${cid}`;

    const pinataJwt = process.env.PINATA_JWT;
    if (pinataJwt) {
      try {
        const pinRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${pinataJwt}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pinataContent: body }),
        });
        if (pinRes.ok) {
          const pinned = (await pinRes.json()) as { IpfsHash?: string };
          if (pinned.IpfsHash) {
            cid = pinned.IpfsHash;
            ipfsUri = `ipfs://${cid}`;
          }
        }
      } catch (err) {
        request.log.warn({ err }, "Pinata pin failed; storing content-addressed locally");
      }
    }

    await prisma.metadataPin.upsert({
      where: { cid },
      update: { payload: canonical, ipfsUri },
      create: { cid, ipfsUri, payload: canonical },
    });

    return reply.send({
      cid,
      ipfsUri,
      pinnedAt: new Date().toISOString(),
      provider: pinataJwt ? "pinata-or-local" : "local-sha256",
    });
  });
}
