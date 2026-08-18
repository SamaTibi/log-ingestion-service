import "dotenv/config";

import Fastify from "fastify";

import {
  initDB,
  closeDB,
} from "./db.js";

import {
  logSchema,
  requestSchema,
  validateTimestamp,
  parseQuery,
  parseAggregateQuery,
  type LogEntry,
} from "./validation.js";

import {
  insertLogs,
  getLogs,
  aggregateLogs,
  deleteOldLogs,
} from "./logs.js";

const app = Fastify({
  logger: true,

  bodyLimit:
    Number(process.env.BODY_LIMIT_BYTES) ||
    16 * 1024 * 1024,
});

let ready = false;

let retentionTimer:
  NodeJS.Timeout | undefined;

app.get("/health", async (_request, reply) => {
  if (!ready) {
    return reply
      .status(503)
      .send({
        status: "starting",
      });
  }

  return reply
    .status(200)
    .send({
      status: "ok",
    });
});

app.post("/logs", async (request, reply) => {
  try {
    const body =
      requestSchema.parse(
        request.body,
      );

    const valid: LogEntry[] = [];

    const rejected: Array<{
      index: number;
      reason: string;
    }> = [];

    for (
      let index = 0;
      index < body.logs.length;
      index++
    ) {
      const result =
        logSchema.safeParse(
          body.logs[index],
        );

      if (!result.success) {
        rejected.push({
          index,
          reason:
            result.error.issues[0]?.message ??
            "invalid log",
        });

        continue;
      }

      const timestampError =
        validateTimestamp(
          result.data.timestamp,
        );

      if (timestampError) {
        rejected.push({
          index,
          reason: timestampError,
        });

        continue;
      }

      valid.push(result.data);
    }

    if (valid.length === 0) {
      return reply
        .status(400)
        .send({
          accepted: 0,
          rejected,
        });
    }

    const result =
      await insertLogs(valid);

    return reply
      .status(200)
      .send({
        accepted: result.accepted,
        rejected,
      });
  } catch {
    return reply
      .status(400)
      .send({
        error:
          "request body must contain a logs array",
      });
  }
});

app.get("/logs", async (
  request,
  reply,
) => {
  try {
    const filters =
      parseQuery(
        request.query as Record<
          string,
          unknown
        >,
      );

    return await getLogs(filters);
  } catch (error) {
    return reply
      .status(400)
      .send({
        error:
          error instanceof Error
            ? error.message
            : "invalid query",
      });
  }
});

app.get(
  "/logs/aggregate",
  async (
    request,
    reply,
  ) => {
    try {
      const params =
        parseAggregateQuery(
          request.query as Record<
            string,
            unknown
          >,
        );

      const buckets =
        await aggregateLogs(params);

      return reply
        .status(200)
        .send({
          buckets,
        });
    } catch (error) {
      return reply
        .status(400)
        .send({
          error:
            error instanceof Error
              ? error.message
              : "invalid query",
        });
    }
  },
);

async function start(): Promise<void> {
  try {
    await initDB();

    await app.listen({
      port:
        Number(
          process.env.PORT ?? 8080,
        ),
      host: "0.0.0.0",
    });

    ready = true;

    const interval =
      Number(
        process.env.RETENTION_INTERVAL_MS ??
          60 * 60 * 1000,
      );

    retentionTimer =
      setInterval(
        () => {
          void deleteOldLogs().catch(
            (error) => {
              app.log.error(error);
            },
          );
        },
        interval,
      );

    app.log.info(
      "Log ingestion service is ready",
    );
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  if (retentionTimer) {
    clearInterval(retentionTimer);
  }

  ready = false;

  await app.close();
  await closeDB();

  process.exit(0);
}

process.on("SIGTERM", () => {
  void shutdown();
});

process.on("SIGINT", () => {
  void shutdown();
});

void start();