import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import * as dotenv from "dotenv";
import { authRoutes } from "./routes/auth";
import { apiRoutes } from "./routes/api";

dotenv.config();

const server = Fastify({ logger: true });

async function start() {
  await server.register(cors, {
    origin: true,
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET || "super-secret-development-key-change-in-production",
  });

  await server.register(authRoutes);
  await server.register(apiRoutes);

  server.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  const port = Number(process.env.PORT) || 4000;
  try {
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 Backend server listening on http://localhost:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

start();
