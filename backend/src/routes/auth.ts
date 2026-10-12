import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  createPublicClient,
  http,
  recoverTypedDataAddress,
  type Address,
  type Hex,
} from "viem";
import { ROLE_HASHES, rolesFromFlags, type AppRole, type JwtUser } from "../lib/roles";

interface ChallengeRecord {
  nonce: string;
  expiresAt: number;
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: Address;
  };
  types: {
    Authentication: readonly any[] | Array<{ name: string; type: string }>;
  };
  message: {
    statement: string;
    address: Address;
    nonce: string;
    issuedAt: string;
  };
}

const nonces = new Map<string, ChallengeRecord>();

const AUTH_TYPES = {
  Authentication: [
    { name: "statement", type: "string" },
    { name: "address", type: "address" },
    { name: "nonce", type: "string" },
    { name: "issuedAt", type: "string" },
  ],
} as const;

const accessControlAbi = [
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

async function readOnChainRoles(address: Address): Promise<AppRole[]> {
  const rpc = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
  const accessControl = process.env.ACCESS_CONTROL_ADDRESS as Address | undefined;
  if (!accessControl) return [];

  const client = createPublicClient({ transport: http(rpc) });
  try {
    const [admin, manager, auditor, user] = await Promise.all([
      (client as any).readContract({
        address: accessControl,
        abi: accessControlAbi,
        functionName: "hasRole",
        args: [ROLE_HASHES.DEFAULT_ADMIN, address],
      }),
      (client as any).readContract({
        address: accessControl,
        abi: accessControlAbi,
        functionName: "hasRole",
        args: [ROLE_HASHES.MANAGER, address],
      }),
      (client as any).readContract({
        address: accessControl,
        abi: accessControlAbi,
        functionName: "hasRole",
        args: [ROLE_HASHES.AUDITOR, address],
      }),
      (client as any).readContract({
        address: accessControl,
        abi: accessControlAbi,
        functionName: "hasRole",
        args: [ROLE_HASHES.USER, address],
      }),
    ]);
    return rolesFromFlags({
      admin: Boolean(admin),
      manager: Boolean(manager),
      auditor: Boolean(auditor),
      user: Boolean(user),
    });
  } catch (err) {
    console.error("[auth] role lookup failed", err);
    return [];
  }
}

export async function authRoutes(server: FastifyInstance) {
  server.post("/challenge", async (request: FastifyRequest, reply: FastifyReply) => {
    const { address } = request.body as { address?: string };
    if (!address || !address.startsWith("0x") || address.length !== 42) {
      return reply.status(400).send({ error: "Valid 0x Ethereum address required" });
    }

    const normalizedAddress = address.toLowerCase() as Address;
    const nonce = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = Date.now() + 5 * 60 * 1000;
    const chainId = Number(process.env.CHAIN_ID || 31337);
    const verifyingContract = (process.env.ACCESS_CONTROL_ADDRESS ||
      "0x0000000000000000000000000000000000000001") as Address;

    const domain = {
      name: "Export License Registry",
      version: "1",
      chainId,
      verifyingContract,
    };

    const message = {
      statement: "Sign in to query the export-license auditor feed and pin license metadata.",
      address: address as Address,
      nonce,
      issuedAt: new Date().toISOString(),
    };

    nonces.set(normalizedAddress, {
      nonce,
      expiresAt,
      domain,
      types: AUTH_TYPES,
      message,
    });

    return reply.send({ nonce, domain, types: AUTH_TYPES, primaryType: "Authentication", message });
  });

  server.post("/verify", async (request: FastifyRequest, reply: FastifyReply) => {
    const { address, signature, nonce } = request.body as {
      address?: string;
      signature?: Hex;
      nonce?: string;
    };

    if (!address || !signature || !nonce) {
      return reply.status(400).send({ error: "Missing address, signature, or nonce" });
    }

    const normalizedAddress = address.toLowerCase() as Address;
    const challenge = nonces.get(normalizedAddress);

    if (!challenge || challenge.nonce !== nonce) {
      return reply.status(401).send({ error: "Invalid or expired challenge nonce" });
    }

    if (Date.now() > challenge.expiresAt) {
      nonces.delete(normalizedAddress);
      return reply.status(401).send({ error: "Challenge nonce has expired" });
    }

    let recovered: string;
    try {
      recovered = await recoverTypedDataAddress({
        domain: challenge.domain,
        types: challenge.types,
        primaryType: "Authentication",
        message: challenge.message,
        signature,
      });
    } catch {
      return reply.status(401).send({ error: "Signature recovery failed" });
    }

    if (recovered.toLowerCase() !== normalizedAddress) {
      return reply.status(401).send({ error: "Signature does not match address" });
    }

    nonces.delete(normalizedAddress);

    const roles = await readOnChainRoles(normalizedAddress);
    const payload: JwtUser = { address: normalizedAddress, roles };
    const token = server.jwt.sign(payload, { expiresIn: "8h" });

    return reply.send({
      token,
      address: normalizedAddress,
      roles,
      authenticated: true,
    });
  });
}
