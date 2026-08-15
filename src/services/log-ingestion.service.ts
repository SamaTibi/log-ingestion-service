import { db } from "../db/client.js";
import { logs } from "../db/schema.js";

import type {
  LogInput,
  IngestLogsResult,
} from "../types/logs.js";

export async function ingestLogs(
  input: LogInput[],
): Promise<IngestLogsResult> {
  const rejected: IngestLogsResult["rejected"] = [];

  const validLogs: Array<{
    timestamp: Date;
    level: LogInput["level"];
    service: string;
    message: string;
    attributes: Record<string, unknown>;
  }> = [];

  const now = Date.now();

  for (let i = 0; i < input.length; i++) {
    const log = input[i];

    const timestamp = new Date(log.timestamp);

    if (timestamp.getTime() > now) {
      rejected.push({
        index: i,
        reason: "timestamp cannot be in the future",
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

  if (validLogs.length > 0) {
    await db.insert(logs).values(validLogs);
  }

  return {
    total: input.length,
    accepted: validLogs.length,
    rejected,
  };
}