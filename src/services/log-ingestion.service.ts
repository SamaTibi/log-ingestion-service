import { sql } from "drizzle-orm";

import { db } from "../db/client.js";
import { logs } from "../db/schema.js";

import type { CreateLogInput } from "../validation/log.js";
import type { LogLevel } from "../types/logs.js";

export interface IngestResult {
  total: number;
  accepted: number;
  rejected: Array<{
    index: number;
    reason: string;
  }>;
}

interface ValidLog {
  timestamp: Date;
  level: LogLevel;
  service: string;
  message: string;
  attributes: Record<string, string | number | boolean>;
}

export async function ingestLogs(
  input: Array<{
    index: number;
    log: CreateLogInput;
  }>,
): Promise<IngestResult> {
  const rejected: IngestResult["rejected"] = [];
  const validLogs: ValidLog[] = [];

  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  const maxFutureTimestamp = now + FIVE_MINUTES;

  for (const item of input) {
    const { index, log } = item;

    const timestamp = new Date(log.timestamp);

    if (timestamp.getTime() > maxFutureTimestamp) {
      rejected.push({
        index,
        reason:
          "timestamp cannot be more than 5 minutes in the future",
      });

      continue;
    }

    validLogs.push({
      timestamp,
      level: log.level,
      service: log.service,
      message: log.message,
      attributes: log.attributes ?? {},
    });
  }

  if (validLogs.length === 0) {
    return {
      total: input.length,
      accepted: 0,
      rejected,
    };
  }

  const payload = JSON.stringify(validLogs);

  await db.execute(sql`
    INSERT INTO logs (
      "timestamp",
      "level",
      "service",
      "message",
      "attributes"
    )
    SELECT
      x.timestamp,
      x.level,
      x.service,
      x.message,
      x.attributes
    FROM jsonb_to_recordset(
      ${payload}::jsonb
    ) AS x(
      timestamp timestamptz,
      level text,
      service text,
      message text,
      attributes jsonb
    )
  `);

  return {
    total: input.length,
    accepted: validLogs.length,
    rejected,
  };
}