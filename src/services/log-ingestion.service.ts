import { db } from "../db/client.js";
import { logs } from "../db/schema.js";
import type { CreateLogInput } from "../validation/log.js";

export interface IngestResult {
  total: number;
  accepted: number;
  rejected: Array<{
    index: number;
    reason: string;
  }>;
}

export async function ingestLogs(
  input: CreateLogInput[],
): Promise<IngestResult> {
  const rejected: IngestResult["rejected"] = [];
  const validLogs: Array<{
    timestamp: Date;
    level: string;
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