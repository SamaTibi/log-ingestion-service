import {
  and,
  desc,
  eq,
} from "drizzle-orm";

import { db } from "../db/client.js";
import { logs } from "../db/schema.js";

export interface QueryLogsOptions {
  limit?: number;
  offset?: number;
  service?: string;
  level?: string;
}

export async function queryLogs(options: QueryLogsOptions = {}) {
  const limit = Math.min(
    Math.max(options.limit ?? 50, 1),
    100,
  );

  const offset = Math.max(options.offset ?? 0, 0);

  const conditions = [];

  if (options.service) {
    conditions.push(eq(logs.service, options.service));
  }

  if (options.level) {
    conditions.push(eq(logs.level, options.level));
  }

  const query = db
    .select()
    .from(logs)
    .orderBy(desc(logs.timestamp))
    .limit(limit)
    .offset(offset);

  if (conditions.length > 0) {
    return db
      .select()
      .from(logs)
      .where(and(...conditions))
      .orderBy(desc(logs.timestamp))
      .limit(limit)
      .offset(offset);
  }

  return query;
}