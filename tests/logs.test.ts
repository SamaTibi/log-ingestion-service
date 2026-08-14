import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

describe("POST /logs", () => {
  it("creates a log", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T11:00:00Z",
        level: "info",
        service: "test-service",
        message: "Test log",
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
      message: "Test log",
      attributes: {
        test: true,
      },
    });
  });

  it("rejects an invalid log", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        level: "info",
        message: "",
      },
    });

    expect(response.statusCode).toBe(400);

    expect(response.json()).toMatchObject({
      error: "Invalid request body",
    });
  });
});