import "dotenv/config";
import { Pool, type PoolClient } from "pg";

const DEFAULT_POOL_SIZE = 10;
const PARTITION_DAYS_AHEAD = 7;

const configuredPoolSize = Number(process.env.DB_POOL_MAX);

const poolSize =
  Number.isFinite(configuredPoolSize) && configuredPoolSize > 0
    ? configuredPoolSize
    : DEFAULT_POOL_SIZE;

export const db = new Pool({
  host: process.env.POSTGRES_HOST ?? "localhost",
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DB ?? "logs_db",
  user: process.env.POSTGRES_USER ?? "logs_user",
  password: process.env.POSTGRES_PASSWORD ?? "logs_password",

  max: poolSize,

  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,

  // Prevent connections from living forever.
  maxLifetimeSeconds: 60 * 30,
});

db.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

function partitionName(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `logs_${year}${month}${day}`;
}

async function ensurePartition(
  client: PoolClient,
  date: Date,
): Promise<void> {
  const start = new Date(date);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const name = partitionName(start);

  await client.query(
    `
      SELECT create_log_partition($1::date, $2::date, $3::text)
    `,
    [
      start.toISOString().slice(0, 10),
      end.toISOString().slice(0, 10),
      name,
    ],
  );
}

async function preparePartitions(): Promise<void> {
  const client = await db.connect();

  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (
      let offset = -1;
      offset <= PARTITION_DAYS_AHEAD;
      offset++
    ) {
      const date = new Date(today);

      date.setUTCDate(
        today.getUTCDate() + offset,
      );

      await ensurePartition(client, date);
    }
  } finally {
    client.release();
  }
}

export async function initDB(): Promise<void> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;

      CREATE SEQUENCE IF NOT EXISTS logs_id_seq;

      CREATE TABLE IF NOT EXISTS logs (
        id BIGINT NOT NULL DEFAULT nextval('logs_id_seq'),
        timestamp TIMESTAMPTZ NOT NULL,
        level TEXT NOT NULL CHECK (
          level IN ('debug', 'info', 'warn', 'error')
        ),
        service TEXT NOT NULL,
        message TEXT NOT NULL,
        attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

        PRIMARY KEY (timestamp, id)
      ) PARTITION BY RANGE (timestamp);

      CREATE OR REPLACE FUNCTION create_log_partition(
        partition_start DATE,
        partition_end DATE,
        partition_name TEXT
      )
      RETURNS VOID
      LANGUAGE plpgsql
      AS $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_class
          WHERE relname = partition_name
        ) THEN
          EXECUTE format(
            'CREATE TABLE %I PARTITION OF logs
             FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            partition_start,
            partition_end
          );
        END IF;
      END;
      $$;

      CREATE INDEX IF NOT EXISTS idx_logs_timestamp_id
        ON logs (timestamp DESC, id DESC);

      CREATE INDEX IF NOT EXISTS idx_logs_service_timestamp
        ON logs (service, timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_logs_level_timestamp
        ON logs (level, timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_logs_attributes
        ON logs USING GIN (attributes);

      CREATE INDEX IF NOT EXISTS idx_logs_message_trgm
        ON logs USING GIN (message gin_trgm_ops);
    `);

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await preparePartitions();
}

export async function closeDB(): Promise<void> {
  await db.end();
}