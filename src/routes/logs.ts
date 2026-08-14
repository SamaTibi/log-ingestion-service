import type { FastifyInstance } from "fastify";

import { db } from "../db/client.js";
import { logs } from "../db/schema.js";
import { createLogSchema } from "../validation/log.js";
import { queryLogs } from "../services/log-query.service.js";

export async function logsRoutes(app: FastifyInstance) {
  app.post("/logs", async (request, reply) => {
    const result = createLogSchema.safeParse(request.body);

    if (!result.success) {
      return reply.code(400).send({
        error: "Invalid request body",
        details: result.error.flatten(),
      });
    }

    const body = result.data;

    const [log] = await db
      .insert(logs)
      .values({
        timestamp: new Date(body.timestamp),
        level: body.level,
        service: body.service,
        message: body.message,
        attributes: body.attributes ?? {},
      })
      .returning();

    return reply.code(201).send(log);
  });

  app.get("/logs", async (request) => {
    const query = request.query as {
      limit?: string;
      offset?: string;
      service?: string;
      level?: string;
    };

    return queryLogs({
      limit: Number(query.limit) || 50,
      offset: Number(query.offset) || 0,
      service: query.service,
      level: query.level,
    });
  });
}