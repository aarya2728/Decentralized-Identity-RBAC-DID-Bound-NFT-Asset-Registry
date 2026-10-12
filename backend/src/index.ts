import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import * as dotenv from "dotenv";
import { authRoutes } from "./routes/auth";
import { apiRoutes } from "./routes/api";
import { setupEventListeners } from "./listeners/eventListener";
import type { Address } from "viem";

dotenv.config();

const server = Fastify({ logger: true });

async function start() {
  const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
  await server.register(cors, {
    origin: [frontendOrigin, "http://127.0.0.1:3000"],
    credentials: true,
  });

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required");
    }
    server.log.warn("JWT_SECRET missing; using development secret");
  }

  await server.register(jwt, {
    secret: jwtSecret || "dev-only-change-me",
  });

  await server.register(authRoutes, { prefix: "/auth" });
  await server.register(apiRoutes, { prefix: "/api" });

  server.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  const port = Number(process.env.PORT) || 4000;
  await server.listen({ port, host: "0.0.0.0" });
  server.log.info(`Backend listening on http://localhost:${port}`);

  const accessControl = process.env.ACCESS_CONTROL_ADDRESS as Address | undefined;
  const identityRegistry = process.env.IDENTITY_REGISTRY_ADDRESS as Address | undefined;
  const assetNft = process.env.ASSET_NFT_ADDRESS as Address | undefined;

  if (accessControl && identityRegistry && assetNft) {
    await setupEventListeners(accessControl, identityRegistry, assetNft);
  } else {
    server.log.warn(
      "Indexer not started: set ACCESS_CONTROL_ADDRESS, IDENTITY_REGISTRY_ADDRESS, ASSET_NFT_ADDRESS"
    );
  }
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
