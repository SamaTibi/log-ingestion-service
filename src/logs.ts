import { db } from "./db.js";

import type {
  AggregateQuery,
  LogEntry,
  LogQuery,
} from "./validation.js";

type LogRow = {
  id: string;
  timestamp: Date;
  level: "debug" | "info" | "warn" | "error";
  service: string;
  message: string;
  attributes: Record<
    string,
    string | number | boolean
  >;
};

type Bucket = {
  start: Date;
  group: string | null;
  count: number;
};

type Cursor = {
  t: string;
  id: string;
};

const DEFAULT_BATCH_SIZE = 1000;

const configuredBatchSize = Number(
  process.env.BATCH_SIZE,
);

const INSERT_BATCH_SIZE =
  Number.isFinite(configuredBatchSize) &&
  configuredBatchSize > 0
    ? Math.floor(configuredBatchSize)
    : DEFAULT_BATCH_SIZE;

const BUCKET_INTERVALS: Record<
  AggregateQuery["bucket"],
  string
> = {
  "1m": "1 minute",
  "5m": "5 minutes",
  "1h": "1 hour",
  "1d": "1 day",
};

function buildWhereClause(
  filters: LogQuery | AggregateQuery,
  values: unknown[],
): string {
  const conditions: string[] = [];

  if (filters.service) {
    values.push(filters.service);

    conditions.push(
      `service = $${values.length}`,
    );
  }

  if (filters.level) {
    values.push(filters.level);

    conditions.push(
      `level = $${values.length}`,
    );
  }

  if (filters.since) {
    values.push(filters.since);

    conditions.push(
      `timestamp >= $${values.length}`,
    );
  }

  if (filters.until) {
    values.push(filters.until);

    conditions.push(
      `timestamp < $${values.length}`,
    );
  }

  if (filters.q) {
    values.push(filters.q);

    conditions.push(
      `message ILIKE '%' || $${values.length} || '%'`,
    );
  }

  for (const [key, value] of filters.attributes) {
    values.push(
      JSON.stringify({
        [key]: value,
      }),
    );

    conditions.push(
      `attributes @> $${values.length}::jsonb`,
    );
  }

  return conditions.length > 0
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
}

function decodeCursor(value: string): Cursor {
  try {
    const decoded = JSON.parse(
      Buffer.from(
        value,
        "base64url",
      ).toString("utf8"),
    ) as unknown;

    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("t" in decoded) ||
      !("id" in decoded)
    ) {
      throw new Error();
    }

    const cursor = decoded as {
      t: unknown;
      id: unknown;
    };

    if (
      typeof cursor.t !== "string" ||
      typeof cursor.id !== "string"
    ) {
      throw new Error();
    }

    const timestamp = new Date(cursor.t);

    if (
      Number.isNaN(timestamp.getTime()) ||
      !/^\d+$/.test(cursor.id)
    ) {
      throw new Error();
    }

    return {
      t: timestamp.toISOString(),
      id: cursor.id,
    };
  } catch {
    throw new Error("invalid cursor");
  }
}

function encodeCursor(row: LogRow): string {
  const cursor: Cursor = {
    t: row.timestamp.toISOString(),
    id: row.id,
  };

  return Buffer.from(
    JSON.stringify(cursor),
    "utf8",
  ).toString("base64url");
}

/**
 * Insert one batch.
 */
async function insertBatch(
  batch: LogEntry[],
): Promise<number> {
  const values: unknown[] = [];
  const rows: string[] = [];

  for (const log of batch) {
    const timestampParam = values.length + 1;

    values.push(
      new Date(log.timestamp),
    );

    const levelParam = values.length + 1;

    values.push(log.level);

    const serviceParam = values.length + 1;

    values.push(log.service);

    const messageParam = values.length + 1;

    values.push(log.message);

    const attributesParam = values.length + 1;

    values.push(
      JSON.stringify(log.attributes),
    );

    rows.push(
      `(
        $${timestampParam},
        $${levelParam},
        $${serviceParam},
        $${messageParam},
        $${attributesParam}::jsonb
      )`,
    );
  }

  await db.query(
    `
      INSERT INTO logs (
        timestamp,
        level,
        service,
        message,
        attributes
      )
      VALUES ${rows.join(", ")}
    `,
    values,
  );

  return batch.length;
}

/**
 * Insert logs in batches.
 */
export async function insertLogs(
  logs: LogEntry[],
): Promise<{ accepted: number }> {
  if (logs.length === 0) {
    return { accepted: 0 };
  }

  let accepted = 0;

  for (
    let start = 0;
    start < logs.length;
    start += INSERT_BATCH_SIZE
  ) {
    const batch = logs.slice(
      start,
      start + INSERT_BATCH_SIZE,
    );

    accepted += await insertBatch(batch);
  }

  return { accepted };
}

export async function getLogs(
  filters: LogQuery,
): Promise<{
  logs: LogRow[];
  next_cursor: string | null;
}> {
  const values: unknown[] = [];

  let where = buildWhereClause(
    filters,
    values,
  );

  if (filters.cursor) {
    const cursor = decodeCursor(
      filters.cursor,
    );

    values.push(new Date(cursor.t));

    const timestampParam =
      `$${values.length}`;

    values.push(BigInt(cursor.id));

    const idParam =
      `$${values.length}`;

    const cursorCondition =
      `(timestamp, id) < (${timestampParam}, ${idParam})`;

    where = where
      ? `${where} AND ${cursorCondition}`
      : `WHERE ${cursorCondition}`;
  }

  return executeLogQuery(
    where,
    values,
    filters.limit,
  );
}

async function executeLogQuery(
  where: string,
  values: unknown[],
  limit: number,
): Promise<{
  logs: LogRow[];
  next_cursor: string | null;
}> {
  values.push(limit + 1);

  const limitParam =
    `$${values.length}`;

  const result = await db.query<LogRow>(
    `
      SELECT
        id::text AS id,
        timestamp,
        level,
        service,
        message,
        attributes
      FROM logs
      ${where}
      ORDER BY timestamp DESC, id DESC
      LIMIT ${limitParam}
    `,
    values,
  );

  const hasMore =
    result.rows.length > limit;

  const rows = hasMore
    ? result.rows.slice(0, limit)
    : result.rows;

  const nextCursor =
    hasMore && rows.length > 0
      ? encodeCursor(
          rows[rows.length - 1],
        )
      : null;

  return {
    logs: rows,
    next_cursor: nextCursor,
  };
}

export async function aggregateLogs(
  filters: AggregateQuery,
): Promise<Bucket[]> {
  const interval =
    BUCKET_INTERVALS[filters.bucket];

  if (!interval) {
    throw new Error("invalid bucket");
  }

  const values: unknown[] = [];

  const conditions =
    buildWhereClause(
      filters,
      values,
    );

  let groupExpression = "NULL";

  if (filters.groupBy === "service") {
    groupExpression = "service";
  } else if (
    filters.groupBy === "level"
  ) {
    groupExpression = "level";
  }

  const result = await db.query<Bucket>(
    `
      SELECT
        date_bin(
          '${interval}'::interval,
          timestamp,
          TIMESTAMPTZ '2000-01-01'
        ) AS start,

        ${groupExpression} AS "group",

        COUNT(*)::int AS count

      FROM logs

      ${conditions}

      GROUP BY 1, 2
      ORDER BY 1 ASC
    `,
    values,
  );

  return result.rows;
}

export async function deleteOldLogs(): Promise<void> {
  const retentionDays = Number(
    process.env.RETENTION_DAYS ?? 30,
  );

  if (
    !Number.isFinite(retentionDays) ||
    retentionDays <= 0
  ) {
    throw new Error(
      "RETENTION_DAYS must be a positive number",
    );
  }

  const cutoff = new Date(
    Date.now() -
      retentionDays *
        24 *
        60 *
        60 *
        1000,
  );

  const result = await db.query<{
    relname: string;
  }>(
    `
      SELECT
        child.relname
      FROM pg_inherits

      JOIN pg_class parent
        ON parent.oid = pg_inherits.inhparent

      JOIN pg_class child
        ON child.oid = pg_inherits.inhrelid

      JOIN pg_namespace namespace
        ON namespace.oid = child.relnamespace

      WHERE parent.relname = 'logs'
        AND namespace.nspname = current_schema()
        AND child.relname ~ '^logs_[0-9]{8}$'
    `,
  );

  for (const row of result.rows) {
    const match =
      /^logs_(\d{4})(\d{2})(\d{2})$/.exec(
        row.relname,
      );

    if (!match) {
      continue;
    }

    const partitionDate = new Date(
      Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
      ),
    );

    const partitionEnd =
      new Date(partitionDate);

    partitionEnd.setUTCDate(
      partitionEnd.getUTCDate() + 1,
    );

    if (partitionEnd <= cutoff) {
      await db.query(
        `DROP TABLE IF EXISTS ${quoteIdentifier(
          row.relname,
        )}`,
      );
    }
  }
}

function quoteIdentifier(
  identifier: string,
): string {
  return `"${identifier.replaceAll(
    '"',
    '""',
  )}"`;
}