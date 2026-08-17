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
import type { LogLevel } from "../types/logs.js";

export interface QueryLogsOptions {
  limit?: number;
  service?: string;
  level?: LogLevel;
  since?: Date;
  until?: Date;
  attributes?: Record<string, string>;
  q?: string;
  cursor?: string;
}

export interface AggregateLogsOptions {
  bucket: "1m" | "5m" | "1h" | "1d";
  groupBy?: "service" | "level";
  service?: string;
  level?: LogLevel;
  since?: Date;
  until?: Date;
  q?: string;
  attributes?: Record<string, string>;
}
interface Cursor {
  timestamp: string;
  id: string;
}

export async function queryLogs(
  options: QueryLogsOptions = {},
) {
  const limit = Math.min(
    Math.max(options.limit ?? 100, 1),
    1000,
  );

  const conditions = [];

  if (options.service) {
    conditions.push(
      eq(logs.service, options.service),
    );
  }

  if (options.level) {
    conditions.push(
      eq(logs.level, options.level),
    );
  }

  if (options.since) {
    conditions.push(
      gte(logs.timestamp, options.since),
    );
  }

  if (options.until) {
    conditions.push(
      lt(logs.timestamp, options.until),
    );
  }

  if (options.q) {
    conditions.push(
      ilike(
        logs.message,
        `%${escapeLike(options.q)}%`,
      ),
    );
  }

  if (options.attributes) {
    for (const [key, value] of Object.entries(
      options.attributes,
    )) {
      conditions.push(
        sql`${logs.attributes} @> ${JSON.stringify({
          [key]: value,
        })}::jsonb`,
      );
    }
  }

  if (options.cursor) {
    const cursor =
      decodeCursor(options.cursor);

    const cursorTimestamp =
      new Date(cursor.timestamp);

    conditions.push(
      or(
        lt(
          logs.timestamp,
          cursorTimestamp,
        ),
        and(
          eq(
            logs.timestamp,
            cursorTimestamp,
          ),
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
    .limit(limit + 1);

  const hasMore =
    rows.length > limit;

  const resultLogs = hasMore
    ? rows.slice(0, limit)
    : rows;

  let nextCursor: string | null = null;

  if (
    hasMore &&
    resultLogs.length > 0
  ) {
    const last =
      resultLogs[resultLogs.length - 1];

    nextCursor = encodeCursor({
      timestamp:
        last.timestamp.toISOString(),
      id: last.id,
    });
  }

  return {
    logs: resultLogs,
    next_cursor: nextCursor,
  };
}

export async function aggregateLogs(
  options: AggregateLogsOptions,
) {
  const intervals = {
    "1m": "1 minute",
    "5m": "5 minutes",
    "1h": "1 hour",
    "1d": "1 day",
  } as const;

  const interval =
    intervals[options.bucket];

  const conditions = [];

  if (options.service) {
    conditions.push(
      eq(logs.service, options.service),
    );
  }

  if (options.level) {
    conditions.push(
      eq(logs.level, options.level),
    );
  }

  if (options.since) {
    conditions.push(
      gte(logs.timestamp, options.since),
    );
  }

  if (options.until) {
    conditions.push(
      lt(logs.timestamp, options.until),
    );
  }

  if (options.q) {
    conditions.push(
      ilike(
        logs.message,
        `%${escapeLike(options.q)}%`,
      ),
    );
  }

  if (options.attributes) {
    for (const [key, value] of Object.entries(
      options.attributes,
    )) {
      conditions.push(
        sql`${logs.attributes} @> ${JSON.stringify({
          [key]: value,
        })}::jsonb`,
      );
    }
  }

  let groupExpression =
    sql`NULL`;

  if (
    options.groupBy === "service"
  ) {
    groupExpression =
      sql`${logs.service}`;
  }

  if (
    options.groupBy === "level"
  ) {
    groupExpression =
      sql`${logs.level}`;
  }

  return db
    .select({
      start: sql<Date>`
        date_bin(
          ${interval}::interval,
          ${logs.timestamp},
          TIMESTAMPTZ '2000-01-01'
        )
      `,
      group: groupExpression,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(logs)
    .where(
      conditions.length > 0
        ? and(...conditions)
        : undefined,
    )
    .groupBy(
      sql`
        date_bin(
          ${interval}::interval,
          ${logs.timestamp},
          TIMESTAMPTZ '2000-01-01'
        )
      `,
      groupExpression,
    )
    .orderBy(
      sql`
        date_bin(
          ${interval}::interval,
          ${logs.timestamp},
          TIMESTAMPTZ '2000-01-01'
        ) ASC
      `,
      sql`${groupExpression} ASC NULLS FIRST`,
    );
}

function decodeCursor(
  cursor: string,
): Cursor {
  try {
    const decoded = JSON.parse(
      Buffer.from(
        cursor,
        "base64url",
      ).toString("utf8"),
    );

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      typeof decoded.timestamp !==
        "string" ||
      typeof decoded.id !==
        "string"
    ) {
      throw new Error();
    }

    const timestamp =
      new Date(decoded.timestamp);

    if (
      Number.isNaN(
        timestamp.getTime(),
      )
    ) {
      throw new Error();
    }

    return {
      timestamp: decoded.timestamp,
      id: decoded.id,
    };
  } catch {
    throw new Error(
      "Invalid cursor",
    );
  }
}

function encodeCursor(
  cursor: Cursor,
): string {
  return Buffer.from(
    JSON.stringify(cursor),
  ).toString("base64url");
}

function escapeLike(
  value: string,
): string {
  return value.replace(
    /[\\%_]/g,
    "\\$&",
  );
}