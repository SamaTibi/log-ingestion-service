import type { FastifyInstance } from "fastify";

import { queryLogs } from "../services/log-query.service.js";
import { ingestLogs } from "../services/log-ingestion.service.js";
import { createLogSchema } from "../validation/log.js";
import type { CreateLogInput } from "../validation/log.js";
import type { LogLevel } from "../types/logs.js";

export async function logsRoutes(app: FastifyInstance) {
  /*
   * POST /logs
   *
   * Expected body:
   *
   * {
   *   "logs": [
   *     {
   *       "timestamp": "...",
   *       "level": "info",
   *       "service": "checkout",
   *       "message": "payment declined",
   *       "attributes": {}
   *     }
   *   ]
   * }
   */
  app.post("/logs", async (request, reply) => {
    const body = request.body;

    /*
     * The specification requires the top-level
     * structure to contain a "logs" array.
     */
    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("logs" in body)
    ) {
      return reply.code(400).send({
        error: "Request body must contain a logs array",
      });
    }

    const rawLogs = body.logs;

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

    const validLogs: Array<{
      index: number;
      log: CreateLogInput;
    }> = [];

    const rejected: Array<{
      index: number;
      reason: string;
    }> = [];

    /*
     * Validate every log independently.
     *
     * An invalid log must not cause the whole batch
     * to fail.
     */
    for (let index = 0; index < rawLogs.length; index++) {
      const result = createLogSchema.safeParse(rawLogs[index]);

      if (!result.success) {
        rejected.push({
          index,
          reason: getValidationReason(result.error),
        });

        continue;
      }

      validLogs.push({
        index,
        log: result.data,
      });
    }

    let ingestion = {
      total: validLogs.length,
      accepted: 0,
      rejected: [] as Array<{
        index: number;
        reason: string;
      }>,
    };

    /*
     * Only send schema-valid logs to the ingestion service.
     */
    if (validLogs.length > 0) {
      try {
        ingestion = await ingestLogs(validLogs);
      } catch (error) {
        request.log.error(error, "Failed to ingest logs");

        return reply.code(500).send({
          error: "Failed to ingest logs",
        });
      }
    }

    const allRejected = [
      ...rejected,
      ...ingestion.rejected,
    ];

    /*
     * The specification requires:
     *
     * 200 -> at least one accepted
     * 400 -> all rejected
     */
    if (ingestion.accepted === 0) {
      return reply.code(400).send({
        accepted: 0,
        rejected: allRejected,
      });
    }

    return reply.code(200).send({
      accepted: ingestion.accepted,
      rejected: allRejected,
    });
  });

  /*
   * GET /logs
   */
  app.get("/logs", async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;

    let since: Date | undefined;
    let until: Date | undefined;

    /*
     * since
     */
    if (query.since !== undefined) {
      since = new Date(query.since);

      if (Number.isNaN(since.getTime())) {
        return reply.code(400).send({
          error: "Invalid since date",
        });
      }
    }

    /*
     * until
     */
    if (query.until !== undefined) {
      until = new Date(query.until);

      if (Number.isNaN(until.getTime())) {
        return reply.code(400).send({
          error: "Invalid until date",
        });
      }
    }

    /*
     * until must not be earlier than since.
     */
    if (since && until && until < since) {
      return reply.code(400).send({
        error: "until must be greater than or equal to since",
      });
    }

    /*
     * limit
     */
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

    /*
     * level
     */
    const validLevels: LogLevel[] = [
      "debug",
      "info",
      "warn",
      "error",
    ];

    if (
      query.level !== undefined &&
      !validLevels.includes(query.level as LogLevel)
    ) {
      return reply.code(400).send({
        error: "Invalid level",
      });
    }

    /*
     * attr.*
     */
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
        level: query.level as LogLevel | undefined,
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

/*
 * Convert Zod validation errors into a simple
 * rejection reason required by the API.
 */
function getValidationReason(error: {
  issues: Array<{
    path: PropertyKey[];
    message: string;
    code: string;
  }>;
}): string {
  const issue = error.issues[0];

  if (!issue) {
    return "Invalid log";
  }

  const field = issue.path.length > 0
    ? String(issue.path[0])
    : "log";

  switch (field) {
    case "timestamp":
      return "invalid timestamp";

    case "level":
      return "invalid level";

    case "service":
      return "invalid service";

    case "message":
      return "invalid message";

    case "attributes":
      return "attributes must be a flat object with string, number, or boolean values";

    default:
      return `invalid ${field}`;
  }
}