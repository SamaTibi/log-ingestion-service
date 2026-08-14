import "dotenv/config";
import { describe, expect, it } from "vitest";
import postgres from "postgres";

describe("PostgreSQL connection", () => {
  it("connects to PostgreSQL", async () => {
    const databaseUrl = process.env.DATABASE_URL;

    expect(databaseUrl).toBeDefined();

    const sql = postgres(databaseUrl!);

    const result = await sql`SELECT 1 AS value`;

    expect(result[0].value).toBe(1);

    await sql.end();
  });
});