import { z } from "zod";

const LEVELS = ["debug", "info", "warn", "error"] as const;
const BUCKETS = ["1m", "5m", "1h", "1d"] as const;

const attributeValueSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
]);

export const logSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  level: z.enum(LEVELS),
  service: z.string().trim().min(1, "service must not be empty"),
  message: z.string().trim().min(1, "message must not be empty"),

  attributes: z
    .record(z.string(), attributeValueSchema)
    .default({}),
});

export const requestSchema = z.object({
  logs: z.array(z.unknown()).min(1, "logs must not be empty"),
});

export type LogEntry = z.infer<typeof logSchema>;

export type LogQuery = {
  service?: string;
  level?: (typeof LEVELS)[number];
  since?: Date;
  until?: Date;
  q?: string;
  limit: number;
  cursor?: string;
  attributes: Array<[string, string]>;
};

export type AggregateQuery = Omit<LogQuery, "limit" | "cursor"> & {
  bucket: (typeof BUCKETS)[number];
  groupBy?: "service" | "level";
};

export function validateTimestamp(timestamp: string): string | null {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "invalid timestamp";
  }

  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;

  if (date.getTime() > fiveMinutesFromNow) {
    return "timestamp cannot be more than 5 minutes in the future";
  }

  return null;
}

function parseDate(
  value: unknown,
  fieldName: "since" | "until",
): Date | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`invalid ${fieldName} timestamp`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`invalid ${fieldName} timestamp`);
  }

  return date;
}

function parseLevel(value: unknown):
  | (typeof LEVELS)[number]
  | undefined {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (
    typeof value !== "string" ||
    !LEVELS.includes(value as (typeof LEVELS)[number])
  ) {
    throw new Error("invalid level");
  }

  return value as (typeof LEVELS)[number];
}

function parseLimit(value: unknown): number {
  if (value === undefined || value === "") {
    return 100;
  }

  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new Error("limit must be between 1 and 1000");
  }

  const limit = Number(value);

  if (limit < 1 || limit > 1000) {
    throw new Error("limit must be between 1 and 1000");
  }

  return limit;
}

function parseAttributes(query: Record<string, unknown>) {
  const attributes: Array<[string, string]> = [];

  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith("attr.")) {
      continue;
    }

    const attributeName = key.slice(5);

    if (!attributeName) {
      throw new Error("attribute name must not be empty");
    }

    if (typeof value !== "string") {
      throw new Error(`invalid attribute filter: ${key}`);
    }

    attributes.push([attributeName, value]);
  }

  return attributes;
}

function parseBaseQuery(
  query: Record<string, unknown>,
): Omit<LogQuery, "limit" | "cursor"> {
  const since = parseDate(query.since, "since");
  const until = parseDate(query.until, "until");

  if (since && until && since >= until) {
    throw new Error("until must be later than since");
  }

  const service =
    query.service === undefined
      ? undefined
      : String(query.service).trim();

  if (service === "") {
    throw new Error("service must not be empty");
  }

  const q =
    query.q === undefined
      ? undefined
      : String(query.q);

  return {
    service,
    level: parseLevel(query.level),
    since,
    until,
    q,
    attributes: parseAttributes(query),
  };
}

export function parseQuery(
  query: Record<string, unknown>,
): LogQuery {
  const base = parseBaseQuery(query);

  const cursor =
    query.cursor === undefined
      ? undefined
      : String(query.cursor);

  return {
    ...base,
    limit: parseLimit(query.limit),
    cursor,
  };
}

export function parseAggregateQuery(
  query: Record<string, unknown>,
): AggregateQuery {
  const base = parseBaseQuery(query);

  if (
    typeof query.bucket !== "string" ||
    !BUCKETS.includes(query.bucket as (typeof BUCKETS)[number])
  ) {
    throw new Error("bucket must be one of: 1m, 5m, 1h, 1d");
  }

  const groupBy =
    query.group_by === undefined
      ? undefined
      : query.group_by;

  if (
    groupBy !== undefined &&
    groupBy !== "service" &&
    groupBy !== "level"
  ) {
    throw new Error("group_by must be service or level");
  }

  if (!base.since) {
    throw new Error("since is required");
  }

  if (!base.until) {
    throw new Error("until is required");
  }

  return {
    ...base,
    bucket: query.bucket as (typeof BUCKETS)[number],
    groupBy,
  };
}