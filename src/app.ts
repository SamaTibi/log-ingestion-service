import "dotenv/config";

import Fastify from "fastify";

import { logsRoutes } from "./routes/logs.js";
import {
  startRetentionWorker,
} from "./services/retention.service.js";

export const app = Fastify({
  logger: true,
});

app.get("/health", async () => {
  return {
    status: "ok",
  };
});

app.register(logsRoutes);

export const retentionTimer =
  startRetentionWorker();

