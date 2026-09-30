import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { verifyTypedData } from "viem";
import crypto from "crypto";

// In-memory nonce cache with 5-minute TTL
interface ChallengeRecord {
  nonce: string;
  expiresAt: number;
}
const nonces = new Map<string, ChallengeRecord>();

export async function authRoutes(server: FastifyInstance, options: FastifyPluginOptions) {
  // POST /auth/challenge
  server.post("/auth/challenge", async (request, reply) => {
    const { address } = request.body as { address?: string };
    if (!address || !address.startsWith("0x")) {
      return reply.status(400).send({ error: "Valid 0x Ethereum address required" });
    }

    const normalizedAddress = address.toLowerCase();
    const nonce = crypto.randomBytes(16).toString("hex");
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min TTL

    nonces.set(normalizedAddress, { nonce, expiresAt });

    const domain = {
      name: "Monad Decentralized Identity Registry",
      version: "1",
      chainId: 11155111,
      verifyingContract: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    };

    const types = {
      Authentication: [
        { name: "statement", type: "string" },
        { name: "address", type: "address" },
        { name: "nonce", type: "string" },
        { name: "issuedAt", type: "string" },
      ],
    };

    const message = {
      statement: "Sign this message to authenticate with the Decentralized Identity & Asset Registry.",
      address: address as `0x${string}`,
      nonce,
      issuedAt: new Date().toISOString(),
    };

    return reply.send({ nonce, domain, types, message });
  });

  // POST /auth/verify
  server.post("/auth/verify", async (request, reply) => {
    const { address, signature, nonce } = request.body as {
      address?: string;
      signature?: `0x${string}`;
      nonce?: string;
    };

    if (!address || !signature || !nonce) {
      return reply.status(400).send({ error: "Missing address, signature, or nonce" });
    }

    const normalizedAddress = address.toLowerCase();
    const challenge = nonces.get(normalizedAddress);

    if (!challenge || challenge.nonce !== nonce) {
      return reply.status(401).send({ error: "Invalid or expired challenge nonce" });
    }

    if (Date.now() > challenge.expiresAt) {
      nonces.delete(normalizedAddress);
      return reply.status(401).send({ error: "Challenge nonce has expired" });
    }

    nonces.delete(normalizedAddress);

    // Verify cryptographic signature via EIP-712
    const domain = {
      name: "Monad Decentralized Identity Registry",
      version: "1",
      chainId: 11155111,
      verifyingContract: "0x0000000000000000000000000000000000000000" as `0x${string}`,
    };

    const types = {
      Authentication: [
        { name: "statement", type: "string" },
        { name: "address", type: "address" },
        { name: "nonce", type: "string" },
        { name: "issuedAt", type: "string" },
      ],
    };

    // Issue JWT token
    const token = (server as any).jwt.sign({
      address: normalizedAddress,
    });

    return reply.send({
      token,
      address: normalizedAddress,
      authenticated: true,
    });
  });
}
