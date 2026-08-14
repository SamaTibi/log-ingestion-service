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

describe("GET /logs", () => {
  it("filters by service", async () => {
    await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T12:00:00Z",
        level: "info",
        service: "checkout-test",
        message: "Checkout completed",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/logs?service=checkout-test",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.logs.length).toBeGreaterThan(0);

    for (const log of body.logs) {
      expect(log.service).toBe("checkout-test");
    }
  });

  it("filters by level", async () => {
    await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T12:01:00Z",
        level: "error",
        service: "level-test",
        message: "Something failed",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/logs?level=error",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.logs.length).toBeGreaterThan(0);

    for (const log of body.logs) {
      expect(log.level).toBe("error");
    }
  });

  it("filters using since inclusively", async () => {
    await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T13:00:00Z",
        level: "info",
        service: "since-test",
        message: "Since boundary",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/logs?service=since-test&since=2026-08-14T13:00:00Z",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.logs.length).toBe(1);
    expect(body.logs[0].message).toBe("Since boundary");
  });

  it("filters using until exclusively", async () => {
    await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T14:00:00Z",
        level: "info",
        service: "until-test",
        message: "Until boundary",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/logs?service=until-test&until=2026-08-14T14:00:00Z",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.logs).toHaveLength(0);
  });

  it("filters by message substring case-insensitively", async () => {
    await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T15:00:00Z",
        level: "info",
        service: "search-test",
        message: "Payment DECLINED by bank",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/logs?service=search-test&q=declined",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.logs).toHaveLength(1);
    expect(body.logs[0].message).toBe("Payment DECLINED by bank");
  });

  it("filters by attributes", async () => {
    await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T16:00:00Z",
        level: "info",
        service: "attribute-test",
        message: "User action",
        attributes: {
          user_id: "42",
          environment: "test",
        },
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/logs?service=attribute-test&attr.user_id=42",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.logs).toHaveLength(1);
    expect(body.logs[0].attributes.user_id).toBe("42");
  });

  it("supports combining multiple filters", async () => {
    await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T17:00:00Z",
        level: "error",
        service: "combined-test",
        message: "Payment DECLINED",
        attributes: {
          environment: "test",
        },
      },
    });

    const response = await app.inject({
      method: "GET",
      url:
        "/logs?service=combined-test&level=error&q=declined&attr.environment=test",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.logs).toHaveLength(1);
    expect(body.logs[0]).toMatchObject({
      level: "error",
      service: "combined-test",
      message: "Payment DECLINED",
      attributes: {
        environment: "test",
      },
    });
  });

  it("uses a default limit of 100", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/logs",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.logs.length).toBeLessThanOrEqual(100);
  });

  it("accepts a limit up to 1000", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/logs?limit=1000",
    });

    expect(response.statusCode).toBe(200);
  });

  it("rejects an invalid limit", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/logs?limit=1001",
    });

    expect(response.statusCode).toBe(400);

    expect(response.json()).toMatchObject({
      error: "Invalid limit",
    });
  });

  it("rejects an invalid level", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/logs?level=invalid",
    });

    expect(response.statusCode).toBe(400);

    expect(response.json()).toMatchObject({
      error: "Invalid level",
    });
  });

  it("rejects an invalid since date", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/logs?since=not-a-date",
    });

    expect(response.statusCode).toBe(400);

    expect(response.json()).toMatchObject({
      error: "Invalid since date",
    });
  });

  it("rejects an invalid until date", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/logs?until=not-a-date",
    });

    expect(response.statusCode).toBe(400);

    expect(response.json()).toMatchObject({
      error: "Invalid until date",
    });
  });

  it("supports cursor pagination", async () => {
    await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T18:00:00Z",
        level: "info",
        service: "cursor-test",
        message: "Cursor first",
      },
    });

    await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T17:59:00Z",
        level: "info",
        service: "cursor-test",
        message: "Cursor second",
      },
    });

    await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        timestamp: "2026-08-14T17:58:00Z",
        level: "info",
        service: "cursor-test",
        message: "Cursor third",
      },
    });

    const firstResponse = await app.inject({
      method: "GET",
      url: "/logs?service=cursor-test&limit=2",
    });

    expect(firstResponse.statusCode).toBe(200);

    const firstBody = firstResponse.json();

    expect(firstBody.logs).toHaveLength(2);
    expect(firstBody.next_cursor).toBeTruthy();

    const secondResponse = await app.inject({
      method: "GET",
      url: `/logs?service=cursor-test&limit=2&cursor=${encodeURIComponent(
        firstBody.next_cursor,
      )}`,
    });

    expect(secondResponse.statusCode).toBe(200);

    const secondBody = secondResponse.json();

    expect(secondBody.logs).toHaveLength(1);
    expect(secondBody.logs[0].message).toBe("Cursor third");
  });
});