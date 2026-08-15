import { sql } from "drizzle-orm";
import { db } from "../../src/db/client.js";

export async function resetDatabase() {
  await db.execute(sql`TRUNCATE TABLE logs RESTART IDENTITY CASCADE`);
}