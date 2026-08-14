import {
  and,
  desc,
  eq,
  gte,
  ilike,
  lt,
  or,
  sql,
} from "drizzle-orm";

import { db } from "../db/client.js";
import { logs } from "../db/schema.js";

export interface QueryLogsOptions {
  limit?: number;
  service?: string;
  level?: string;
  since?: Date;
  until?: Date;
  attributes?: Record<string, string>;
  q?: string;
  cursor?: string;
}

interface Cursor {
  timestamp: string;
  id: string;
}

export async function queryLogs(options: QueryLogsOptions = {}) {
  const limit = Math.min(
    Math.max(options.limit ?? 100, 1),
    1000,
  );

  const conditions = [];

  // Filter by service
  if (options.service) {
    conditions.push(eq(logs.service, options.service));
  }

  // Filter by level
  if (options.level) {
    conditions.push(eq(logs.level, options.level));
  }

  // since is inclusive
  if (options.since) {
    conditions.push(gte(logs.timestamp, options.since));
  }

  // until is exclusive
  if (options.until) {
    conditions.push(lt(logs.timestamp, options.until));
  }

  // Case-insensitive substring search in message
  if (options.q) {
    conditions.push(
      ilike(logs.message, `%${options.q}%`),
    );
  }

  // Filter by JSONB attributes
  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      conditions.push(
        sql`${logs.attributes} ->> ${key} = ${value}`,
      );
    }
  }

  // Cursor pagination
  if (options.cursor) {
    let cursor: Cursor;

    try {
      cursor = JSON.parse(
        Buffer.from(options.cursor, "base64url").toString("utf8"),
      );
    } catch {
      throw new Error("Invalid cursor");
    }

    if (
      typeof cursor.timestamp !== "string" ||
      typeof cursor.id !== "string"
    ) {
      throw new Error("Invalid cursor");
    }

    const cursorTimestamp = new Date(cursor.timestamp);

    if (Number.isNaN(cursorTimestamp.getTime())) {
      throw new Error("Invalid cursor");
    }

    /*
     * Results are ordered:
     *   timestamp DESC
     *   id DESC
     *
     * Therefore, the next page contains rows where:
     *
     * timestamp < cursor timestamp
     *
     * OR, when timestamps are equal:
     *
     * id < cursor id
     */
    conditions.push(
      or(
        lt(logs.timestamp, cursorTimestamp),
        and(
          eq(logs.timestamp, cursorTimestamp),
          lt(logs.id, cursor.id),
        ),
      ),
    );
  }

  const rows = await db
    .select()
    .from(logs)
    .where(
      conditions.length > 0
        ? and(...conditions)
        : undefined,
    )
    .orderBy(
      desc(logs.timestamp),
      desc(logs.id),
    )
    .limit(limit);

  let nextCursor: string | null = null;

  /*
   * If we received a full page, there may be another page.
   */
  if (rows.length === limit) {
    const last = rows[rows.length - 1];

    const cursor: Cursor = {
      timestamp: last.timestamp.toISOString(),
      id: last.id,
    };

    nextCursor = Buffer.from(
      JSON.stringify(cursor),
    ).toString("base64url");
  }

  return {
    logs: rows,
    next_cursor: nextCursor,
  };
}

