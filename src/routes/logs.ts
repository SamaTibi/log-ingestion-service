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

  app.get("/logs", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;

    let since: Date | undefined;
    let until: Date | undefined;

    // since - inclusive
    if (query.since !== undefined) {
      since = new Date(query.since);

      if (Number.isNaN(since.getTime())) {
        return reply.code(400).send({
          error: "Invalid since date",
        });
      }
    }

    // until - exclusive
    if (query.until !== undefined) {
      until = new Date(query.until);

      if (Number.isNaN(until.getTime())) {
        return reply.code(400).send({
          error: "Invalid until date",
        });
      }
    }

    // limit: default 100, maximum 1000
    let limit = 100;

    if (query.limit !== undefined) {
      limit = Number(query.limit);

      if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
        return reply.code(400).send({
          error: "Invalid limit",
        });
      }
    }

    const validLevels = ["debug", "info", "warn", "error"];

    if (
      query.level !== undefined &&
      !validLevels.includes(query.level)
    ) {
      return reply.code(400).send({
        error: "Invalid level",
      });
    }

    // Collect attr.<key> query parameters
    const attributes: Record<string, string> = {};

    for (const [key, value] of Object.entries(query)) {
      if (key.startsWith("attr.") && value !== undefined) {
        const attributeKey = key.slice(5);

        if (attributeKey.length > 0) {
          attributes[attributeKey] = value;
        }
      }
    }

    return queryLogs({
      limit,
      service: query.service,
      level: query.level,
      since,
      until,
      attributes,
      q: query.q,
      cursor: query.cursor,
    });
  });
}