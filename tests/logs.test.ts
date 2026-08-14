import "dotenv/config";
import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { db } from "../src/db/client.js";
import { logs } from "../src/db/schema.js";

describe("POST /logs", () => {
  it("creates a log successfully", async () => {
    const app = Fastify();

    app.post("/logs", async (request, reply) => {
      const body = request.body as {
        timestamp: string;
        level: string;
        service: string;
        message: string;
        attributes?: Record<string, unknown>;
      };

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

    const response = await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T10:45:00Z",
        level: "info",
        service: "test-service",
        message: "Test log from Vitest",
        attributes: {
          test: true,
        },
      },
    });

    expect(response.statusCode).toBe(201);

    const body = response.json();

    expect(body).toMatchObject({
      level: "info",
      service: "test-service",
      message: "Test log from Vitest",
      attributes: {
        test: true,
      },
    });

    expect(body.id).toBeDefined();
    expect(body.createdAt).toBeDefined();

    await app.close();
  });
});