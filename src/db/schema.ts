import {
    pgTable,
    uuid,
    timestamp,
    varchar,
    text,
    jsonb,
    index,
} from "drizzle-orm/pg-core";

export const logs = pgTable(
    "logs",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        timestamp: timestamp("timestamp", {
            withTimezone: true,
        }).notNull(),

        level: varchar("level", {
            length: 20,
        }).notNull(),

        service: varchar("service", {
            length: 100,
        }).notNull(),

        message: text("message").notNull(),

        attributes: jsonb("attributes").notNull().default({}),

        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("logs_timestamp_idx").on(table.timestamp),
        index("logs_service_idx").on(table.service),
        index("logs_level_idx").on(table.level),

        index("logs_service_timestamp_idx").on(
            table.service,
            table.timestamp,
        ),

        index("logs_level_timestamp_idx").on(
            table.level,
            table.timestamp,
        ),
    ],
);