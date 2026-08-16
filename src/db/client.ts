import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

const databaseUrl =
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined",
  );
}

const client = postgres(
  databaseUrl,
  {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  },
);

export const db =
  drizzle(client);

