import type { FastifyInstance } from "fastify";

import { queryLogs } from "../services/log-query.service.js";
import { ingestLogs } from "../services/log-ingestion.service.js";
import { createLogSchema } from "../validation/log.js";

export async function logsRoutes(app: FastifyInstance) {
  app.post("/logs", async (request, reply) => {
    const body = request.body;

    // Single log format
    if (
      body !== null &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      !("logs" in body)
    ) {
      const result = createLogSchema.safeParse(body);

      if (!result.success) {
        return reply.code(400).send({
          error: "Invalid request body",
          details: result.error.flatten(),
        });
      }

      const ingestion = await ingestLogs([result.data]);

      if (ingestion.accepted === 0) {
        return reply.code(400).send({
          error: "Log rejected",
          details: ingestion.rejected,
        });
      }

      const log = result.data;

      return reply.code(201).send({
        timestamp: new Date(log.timestamp),
        level: log.level,
        service: log.service,
        message: log.message,
        attributes: log.attributes ?? {},
      });
    }

    // Batch format:
    // {
    //   "logs": [...]
    // }
    //
    // Also accept a raw array for compatibility.
    let rawLogs: unknown;

    if (Array.isArray(body)) {
      rawLogs = body;
    } else if (
      body !== null &&
      typeof body === "object" &&
      "logs" in body
    ) {
      rawLogs = body.logs;
    } else {
      return reply.code(400).send({
        error: "Invalid request body",
      });
    }

    if (!Array.isArray(rawLogs)) {
      return reply.code(400).send({
        error: "logs must be an array",
      });
    }

    if (rawLogs.length === 0) {
      return reply.code(400).send({
        error: "logs must not be empty",
      });
    }

    const validLogs = [];
    const rejected = [];

    for (let i = 0; i < rawLogs.length; i++) {
      const result = createLogSchema.safeParse(rawLogs[i]);

      if (!result.success) {
        rejected.push({
          index: i,
          reason: "Invalid log",
          details: result.error.flatten(),
        });
        continue;
      }

      validLogs.push(result.data);
    }

    const ingestion = await ingestLogs(validLogs);

    return reply.code(200).send({
      total: rawLogs.length,
      accepted: ingestion.accepted,
      rejected: [
        ...rejected,
        ...ingestion.rejected,
      ],
    });
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

    if (since && until && until < since) {
      return reply.code(400).send({
        error: "until must be greater than or equal to since",
      });
    }

    // limit: default 100, maximum 1000
    let limit = 100;

    if (query.limit !== undefined) {
      limit = Number(query.limit);

      if (
        !Number.isInteger(limit) ||
        limit < 1 ||
        limit > 1000
      ) {
        return reply.code(400).send({
          error: "Invalid limit",
        });
      }
    }

    const validLevels = [
      "debug",
      "info",
      "warn",
      "error",
    ];

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

    try {
      return await queryLogs({
        limit,
        service: query.service,
        level: query.level,
        since,
        until,
        attributes,
        q: query.q,
        cursor: query.cursor,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Invalid cursor"
      ) {
        return reply.code(400).send({
          error: "Invalid cursor",
        });
      }

      throw error;
    }
  });
}