import { sql } from "drizzle-orm";

import { db } from "../db/client.js";
import { logs } from "../db/schema.js";

export async function deleteOldLogs(): Promise<number> {
  const days = Number(
    process.env.RETENTION_DAYS ?? 30,
  );

  const batchSize = Number(
    process.env.RETENTION_BATCH_SIZE ?? 5000,
  );

  if (
    !Number.isFinite(days) ||
    days <= 0
  ) {
    throw new Error(
      "RETENTION_DAYS must be greater than zero",
    );
  }

  if (
    !Number.isInteger(batchSize) ||
    batchSize <= 0
  ) {
    throw new Error(
      "RETENTION_BATCH_SIZE must be a positive integer",
    );
  }

  let totalDeleted = 0;

  while (true) {
    const result = await db.execute(sql`
      DELETE FROM ${logs}
      WHERE ${logs.id} IN (
        SELECT ${logs.id}
        FROM ${logs}
        WHERE ${logs.timestamp} <
          NOW() -
          (${days} * INTERVAL '1 day')
        ORDER BY ${logs.timestamp} ASC
        LIMIT ${batchSize}
      )
    `);

    const deleted =
      Number(result.count ?? 0);

    totalDeleted += deleted;

    if (deleted < batchSize) {
      break;
    }
  }

  return totalDeleted;
}

export function startRetentionWorker() {
  const intervalMs = Number(
    process.env.RETENTION_INTERVAL_MS ??
      60 * 60 * 1000,
  );

  const run = async () => {
    try {
      const deleted =
        await deleteOldLogs();

      if (deleted > 0) {
        console.log(
          `[retention] deleted ${deleted} old logs`,
        );
      }
    } catch (error) {
      console.error(
        "[retention] cleanup failed",
        error,
      );
    }
  };

  void run();

  const timer = setInterval(
    () => {
      void run();
    },
    intervalMs,
  );

  return timer;
}

