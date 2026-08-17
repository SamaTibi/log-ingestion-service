import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const logLevelEnum =
  pgEnum("log_level", [
    "debug",
    "info",
    "warn",
    "error",
  ]);

export const logs = pgTable(
  "logs",
  {
    id: uuid("id")
      .defaultRandom()
      .primaryKey(),

    timestamp: timestamp(
      "timestamp",
      {
        withTimezone: true,
      },
    ).notNull(),

    level: logLevelEnum(
      "level",
    ).notNull(),

    service: text(
      "service",
    ).notNull(),

    message: text(
      "message",
    ).notNull(),

    attributes: jsonb(
      "attributes",
    )
      .$type<
        Record<
          string,
          string | number | boolean
        >
      >()
      .notNull()
      .default({}),
  },
  (table) => ({
    timestampIdx: index(
      "logs_timestamp_idx",
    ).on(table.timestamp),

    timestampIdIdx: index(
      "logs_timestamp_id_idx",
    ).on(
      table.timestamp,
      table.id,
    ),

    serviceIdx: index(
      "logs_service_idx",
    ).on(table.service),

    levelIdx: index(
      "logs_level_idx",
    ).on(table.level),
  }),
);