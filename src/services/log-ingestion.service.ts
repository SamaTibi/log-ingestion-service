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

  /*
   * Calculate the maximum allowed timestamp.
   *
   * We allow timestamps up to 5 minutes in the future.
   *
   * We add a small tolerance because the timestamp in the request
   * may have been created a few milliseconds before this function
   * runs. Without the tolerance, a timestamp created with exactly
   * Date.now() + 5 minutes can sometimes be rejected.
   */
  const now = Date.now();

  const FIVE_MINUTES = 5 * 60 * 1000;

  // Small tolerance for execution-time differences.
  const FUTURE_TIMESTAMP_TOLERANCE = 1000;

  const maxFutureTimestamp =
    now + FIVE_MINUTES + FUTURE_TIMESTAMP_TOLERANCE;

  for (const item of input) {
    const { index, log } = item;

    const timestamp = new Date(log.timestamp);

    /*
     * Reject logs that are more than 5 minutes in the future.
     */
    if (timestamp.getTime() > maxFutureTimestamp) {
      rejected.push({
        index,
        reason: "timestamp cannot be more than 5 minutes in the future",
      });

      continue;
    }

    /*
     * This log is valid, so prepare it for insertion into PostgreSQL.
     */
    validLogs.push({
      timestamp,
      level: log.level,
      service: log.service,
      message: log.message,
      attributes: log.attributes ?? {},
    });
  }

  /*
   * Insert all valid logs in one database operation.
   *
   * Invalid logs are not inserted.
   */
  if (validLogs.length > 0) {
    await db.insert(logs).values(validLogs);
  }

  return {
    total: input.length,
    accepted: validLogs.length,
    rejected,
  };
}