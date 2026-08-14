import "dotenv/config";
import Fastify from "fastify";
import { and, desc, eq } from "drizzle-orm";

import { db } from "./db/client.js";
import { logs } from "./db/schema.js";
import { createLogSchema } from "./validation/log.js";

export const app = Fastify({
  logger: true,
});

app.get("/health", async () => {
  return {
    status: "ok",
  };
});

app.post("/logs", async (request, reply) => {
  const result = createLogSchema.safeParse(request.body);

  if (!result.success) {
    return reply.code(400).send({
      error: "Invalid request body",
      details: result.error.flatten(),
    });
  }

  const body = result.data;

  const [log] = await db
    .insert(logs)
    .values({
      timestamp: new Date(body.timestamp),
      level: body.level,
      service: body.service,
      message: body.message,
      attributes: body.attributes ?? {},
    })
    .returning();

  return reply.code(201).send(log);
});

app.get("/logs", async (request) => {
  const query = request.query as {
    limit?: string;
    offset?: string;
    service?: string;
    level?: string;
  };

  const limit = Math.min(
    Math.max(Number(query.limit) || 50, 1),
    100,
  );

  const offset = Math.max(Number(query.offset) || 0, 0);

  const conditions = [];

  if (query.service) {
    conditions.push(eq(logs.service, query.service));
  }

  if (query.level) {
    conditions.push(eq(logs.level, query.level));
  }

  const result = conditions.length
    ? await db
        .select()
        .from(logs)
        .where(and(...conditions))
        .orderBy(desc(logs.timestamp))
        .limit(limit)
        .offset(offset)
    : await db
        .select()
        .from(logs)
        .orderBy(desc(logs.timestamp))
        .limit(limit)
        .offset(offset);

  return result;
});