import { describe, expect, it } from "vitest";
import Fastify from "fastify";

describe("GET /health", () => {
  it("returns 200 and healthy status", async () => {
    const app = Fastify();

    app.get("/health", async () => {
      return {
        status: "ok",
      };
    });

    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
    });

    await app.close();
  });
});