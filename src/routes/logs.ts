import type { FastifyInstance } from "fastify";

import {
  aggregateLogs,
  queryLogs,
} from "../services/log-query.service.js";

import {
  ingestLogs,
} from "../services/log-ingestion.service.js";

import {
  createLogSchema,
} from "../validation/log.js";

import type {
  CreateLogInput,
} from "../validation/log.js";

import type {
  LogLevel,
} from "../types/logs.js";

export async function logsRoutes(
  app: FastifyInstance,
) {
  app.post("/logs", async (request, reply) => {
    const body = request.body;

    if (
      body === null ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("logs" in body)
    ) {
      return reply.code(400).send({
        error:
          "Request body must contain a logs array",
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

    for (
      let index = 0;
      index < rawLogs.length;
      index++
    ) {
      const result =
        createLogSchema.safeParse(
          rawLogs[index],
        );

      if (!result.success) {
        rejected.push({
          index,
          reason: getValidationReason(
            result.error,
          ),
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

    if (validLogs.length > 0) {
      try {
        ingestion = await ingestLogs(
          validLogs,
        );
      } catch (error) {
        request.log.error(
          error,
          "Failed to ingest logs",
        );

        return reply.code(500).send({
          error: "Failed to ingest logs",
        });
      }
    }

    const allRejected = [
      ...rejected,
      ...ingestion.rejected,
    ];

    if (ingestion.accepted === 0) {
      return reply.code(400).send({
        total: rawLogs.length,
        accepted: 0,
        rejected: allRejected,
      });
    }

    return reply.code(200).send({
      total: rawLogs.length,
      accepted: ingestion.accepted,
      rejected: allRejected,
    });
  });

  app.get("/logs", async (request, reply) => {
    const query =
      request.query as Record<
        string,
        string | undefined
      >;

    const dates =
      parseDateFilters(query);

    if (dates.error) {
      return reply.code(400).send({
        error: dates.error,
      });
    }

    const limit =
      parseLimit(query.limit);

    if (limit === null) {
      return reply.code(400).send({
        error: "Invalid limit",
      });
    }

    const level =
      parseLevel(query.level);

    if (
      query.level !== undefined &&
      level === null
    ) {
      return reply.code(400).send({
        error: "Invalid level",
      });
    }

    const attributes =
      parseAttributes(query);

    try {
      return await queryLogs({
        limit,
        service: query.service,
        level: level ?? undefined,
        since: dates.since,
        until: dates.until,
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

      request.log.error(
        error,
        "Failed to query logs",
      );

      return reply.code(500).send({
        error: "Failed to query logs",
      });
    }
  });

  app.get(
    "/logs/aggregate",
    async (request, reply) => {
      const query =
        request.query as Record<
          string,
          string | undefined
        >;

      const bucket = query.bucket;

      if (
        bucket !== "1m" &&
        bucket !== "5m" &&
        bucket !== "1h" &&
        bucket !== "1d"
      ) {
        return reply.code(400).send({
          error:
            "bucket must be one of: 1m, 5m, 1h, 1d",
        });
      }

      const groupBy =
        query.group_by;

      if (
        groupBy !== undefined &&
        groupBy !== "service" &&
        groupBy !== "level"
      ) {
        return reply.code(400).send({
          error:
            "group_by must be service or level",
        });
      }

      const dates =
        parseDateFilters(query);

      if (dates.error) {
        return reply.code(400).send({
          error: dates.error,
        });
      }

      const level =
        parseLevel(query.level);

      if (
        query.level !== undefined &&
        level === null
      ) {
        return reply.code(400).send({
          error: "Invalid level",
        });
      }

      const attributes =
        parseAttributes(query);

      try {
        return await aggregateLogs({
          bucket,
          groupBy:
            groupBy as
              | "service"
              | "level"
              | undefined,
          service: query.service,
          level: level ?? undefined,
          since: dates.since,
          until: dates.until,
          q: query.q,
          attributes,
        });
      } catch (error) {
        request.log.error(
          error,
          "Failed to aggregate logs",
        );

        return reply.code(500).send({
          error: "Failed to aggregate logs",
        });
      }
    },
  );
}

function parseLimit(
  value: string | undefined,
): number | null {
  if (value === undefined) {
    return 100;
  }

  const limit = Number(value);

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 1000
  ) {
    return null;
  }

  return limit;
}

function parseLevel(
  value: string | undefined,
): LogLevel | null {
  if (value === undefined) {
    return null;
  }

  const levels: LogLevel[] = [
    "debug",
    "info",
    "warn",
    "error",
  ];

  return levels.includes(
    value as LogLevel,
  )
    ? (value as LogLevel)
    : null;
}

function parseDateFilters(
  query: Record<
    string,
    string | undefined
  >,
) {
  let since: Date | undefined;
  let until: Date | undefined;

  if (query.since !== undefined) {
    since = new Date(query.since);

    if (Number.isNaN(since.getTime())) {
      return {
        error: "Invalid since date",
        since: undefined,
        until: undefined,
      };
    }
  }

  if (query.until !== undefined) {
    until = new Date(query.until);

    if (Number.isNaN(until.getTime())) {
      return {
        error: "Invalid until date",
        since,
        until: undefined,
      };
    }
  }

  if (
    since &&
    until &&
    until < since
  ) {
    return {
      error:
        "until must be greater than or equal to since",
      since,
      until,
    };
  }

  return {
    error: undefined,
    since,
    until,
  };
}

function parseAttributes(
  query: Record<
    string,
    string | undefined
  >,
): Record<string, string> {
  const attributes: Record<
    string,
    string
  > = {};

  for (const [key, value] of Object.entries(
    query,
  )) {
    if (
      key.startsWith("attr.") &&
      value !== undefined
    ) {
      const attributeKey =
        key.slice(5);

      if (attributeKey.length > 0) {
        attributes[attributeKey] = value;
      }
    }
  }

  return attributes;
}

function getValidationReason(
  error: {
    issues: Array<{
      path: PropertyKey[];
      message: string;
    }>;
  },
): string {
  const issue = error.issues[0];

  if (!issue) {
    return "Invalid log";
  }

  const field =
    issue.path.length > 0
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
      return "invalid attributes";

    default:
      return `invalid ${field}`;
  }
}