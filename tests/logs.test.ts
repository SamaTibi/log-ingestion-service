import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { resetDatabase } from "./helpers/reset-database.js";

beforeEach(async () => {
    await resetDatabase();
});

describe("POST /logs", () => {
    it("creates a batch containing one log", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "info",
                        service: "test-service",
                        message: "Test log",
                        attributes: {
                            test: true,
                        },
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.accepted).toBe(1);
        expect(body.rejected).toHaveLength(0);
    });

    it("accepts a batch containing multiple valid logs", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "info",
                        service: "service-a",
                        message: "First log",
                    },
                    {
                        timestamp: "2026-08-14T11:01:00Z",
                        level: "error",
                        service: "service-b",
                        message: "Second log",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.accepted).toBe(2);
        expect(body.rejected).toHaveLength(0);
    });

    it("rejects an invalid log", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "info",
                        service: "",
                        message: "Invalid service",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(400);

        const body = response.json();

        expect(body.accepted).toBe(0);
        expect(body.rejected).toHaveLength(1);
        expect(body.rejected[0].index).toBe(0);
    });

    it("processes valid and invalid logs independently", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "info",
                        service: "valid-service",
                        message: "Valid log",
                    },
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "critical",
                        service: "invalid-service",
                        message: "Invalid level",
                    },
                    {
                        timestamp: "2026-08-14T11:01:00Z",
                        level: "error",
                        service: "another-valid-service",
                        message: "Another valid log",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.accepted).toBe(2);
        expect(body.rejected).toHaveLength(1);
        expect(body.rejected[0].index).toBe(1);
    });

    it("preserves original indexes when multiple logs are invalid", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "info",
                        service: "valid-service",
                        message: "Valid",
                    },
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "critical",
                        service: "invalid-service",
                        message: "Invalid level",
                    },
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "info",
                        service: "",
                        message: "Invalid service",
                    },
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "error",
                        service: "valid-service-2",
                        message: "Valid again",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.accepted).toBe(2);
        expect(body.rejected).toHaveLength(2);

        expect(body.rejected[0].index).toBe(1);
        expect(body.rejected[1].index).toBe(2);
    });

    it("returns 400 when every log is rejected", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "critical",
                        service: "service-a",
                        message: "Invalid level",
                    },
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "info",
                        service: "",
                        message: "Invalid service",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(400);

        const body = response.json();

        expect(body.accepted).toBe(0);
        expect(body.rejected).toHaveLength(2);
    });

    it("rejects an empty logs array", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [],
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: "logs must not be empty",
        });
    });

    it("rejects a request without the logs property", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                timestamp: "2026-08-14T11:00:00Z",
                level: "info",
                service: "test-service",
                message: "Invalid top-level structure",
            },
        });

        expect(response.statusCode).toBe(400);
    });

    it("rejects when logs is not an array", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: {
                    timestamp: "2026-08-14T11:00:00Z",
                },
            },
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: "logs must be an array",
        });
    });

    it("accepts timestamps up to five minutes in the future", async () => {
        const timestamp = new Date(
            Date.now() + 4 * 60 * 1000,
        ).toISOString();

        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp,
                        level: "info",
                        service: "future-test",
                        message: "Valid future log",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.accepted).toBe(1);
        expect(body.rejected).toHaveLength(0);
    });

    it("rejects timestamps more than five minutes in the future", async () => {
        const timestamp = new Date(
            Date.now() + 6 * 60 * 1000,
        ).toISOString();

        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp,
                        level: "info",
                        service: "future-test",
                        message: "Too far in future",
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(400);

        const body = response.json();

        expect(body.accepted).toBe(0);
        expect(body.rejected).toHaveLength(1);
        expect(body.rejected[0].index).toBe(0);
    });

    it("accepts string, number, and boolean attributes", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "info",
                        service: "attribute-test",
                        message: "Valid attributes",
                        attributes: {
                            user_id: "42",
                            retries: 3,
                            successful: true,
                        },
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.accepted).toBe(1);
        expect(body.rejected).toHaveLength(0);
    });

    it("rejects nested attribute objects", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "info",
                        service: "attribute-test",
                        message: "Nested attributes",
                        attributes: {
                            user: {
                                id: 42,
                            },
                        },
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(400);

        const body = response.json();

        expect(body.accepted).toBe(0);
        expect(body.rejected).toHaveLength(1);
        expect(body.rejected[0].index).toBe(0);
    });

    it("rejects array attributes", async () => {
        const response = await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "info",
                        service: "attribute-test",
                        message: "Array attributes",
                        attributes: {
                            tags: ["one", "two"],
                        },
                    },
                ],
            },
        });

        expect(response.statusCode).toBe(400);

        const body = response.json();

        expect(body.accepted).toBe(0);
        expect(body.rejected).toHaveLength(1);
        expect(body.rejected[0].index).toBe(0);
    });
});

describe("POST /logs - timestamp validation", () => {
  it("accepts a log up to 5 minutes in the future", async () => {
    const timestamp = new Date(
      Date.now() + 4 * 60 * 1000,
    ).toISOString();

    const response = await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        logs: [
          {
            timestamp,
            level: "info",
            service: "future-test",
            message: "Allowed future log",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.accepted).toBe(1);
    expect(body.rejected).toHaveLength(0);
  });

  it("accepts a log exactly 5 minutes in the future", async () => {
    const timestamp = new Date(
      Date.now() + 5 * 60 * 1000,
    ).toISOString();

    const response = await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        logs: [
          {
            timestamp,
            level: "info",
            service: "future-boundary-test",
            message: "Boundary future log",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();

    expect(body.accepted).toBe(1);
    expect(body.rejected).toHaveLength(0);
  });

  it("rejects a log more than 5 minutes in the future", async () => {
    const timestamp = new Date(
      Date.now() + 6 * 60 * 1000,
    ).toISOString();

    const response = await app.inject({
      method: "POST",
      url: "/logs",
      payload: {
        logs: [
          {
            timestamp,
            level: "info",
            service: "future-test",
            message: "Rejected future log",
          },
        ],
      },
    });

    expect(response.statusCode).toBe(400);

    const body = response.json();

    expect(body.accepted).toBe(0);
    expect(body.rejected).toHaveLength(1);

    expect(body.rejected[0]).toMatchObject({
      index: 0,
      reason: "timestamp cannot be more than 5 minutes in the future",
    });
  });
});




describe("GET /logs", () => {
    it("filters by service", async () => {
        await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T12:00:00Z",
                        level: "info",
                        service: "checkout-test",
                        message: "Checkout completed",
                    },
                ],
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
                logs: [
                    {
                        timestamp: "2026-08-14T12:01:00Z",
                        level: "error",
                        service: "level-test",
                        message: "Something failed",
                    },
                ],
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
                logs: [
                    {
                        timestamp: "2026-08-14T13:00:00Z",
                        level: "info",
                        service: "since-test",
                        message: "Since boundary",
                    },
                ],
            },
        });

        const response = await app.inject({
            method: "GET",
            url: "/logs?service=since-test&since=2026-08-14T13:00:00Z",
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.logs).toHaveLength(1);
        expect(body.logs[0].message).toBe("Since boundary");
    });

    it("filters using until exclusively", async () => {
        await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T14:00:00Z",
                        level: "info",
                        service: "until-test",
                        message: "Until boundary",
                    },
                ],
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
                logs: [
                    {
                        timestamp: "2026-08-14T15:00:00Z",
                        level: "info",
                        service: "search-test",
                        message: "Payment DECLINED by bank",
                    },
                ],
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
                logs: [
                    {
                        timestamp: "2026-08-14T16:00:00Z",
                        level: "info",
                        service: "attribute-test",
                        message: "User action",
                        attributes: {
                            user_id: "42",
                            environment: "test",
                        },
                    },
                ],
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
                logs: [
                    {
                        timestamp: "2026-08-14T17:00:00Z",
                        level: "error",
                        service: "combined-test",
                        message: "Payment DECLINED",
                        attributes: {
                            environment: "test",
                        },
                    },
                ],
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

    it("rejects a limit above 1000", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/logs?limit=1001",
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: "Invalid limit",
        });
    });

    it("rejects a non-numeric limit", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/logs?limit=abc",
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: "Invalid limit",
        });
    });

    it("rejects a zero limit", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/logs?limit=0",
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

    it("rejects until when it is earlier than since", async () => {
        const response = await app.inject({
            method: "GET",
            url:
                "/logs?since=2026-08-14T15:00:00Z&until=2026-08-14T14:00:00Z",
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: "until must be greater than or equal to since",
        });
    });

    it("supports cursor pagination", async () => {
        await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T18:00:00Z",
                        level: "info",
                        service: "cursor-test",
                        message: "Cursor first",
                    },
                ],
            },
        });

        await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T17:59:00Z",
                        level: "info",
                        service: "cursor-test",
                        message: "Cursor second",
                    },
                ],
            },
        });

        await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T17:58:00Z",
                        level: "info",
                        service: "cursor-test",
                        message: "Cursor third",
                    },
                ],
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
        expect(secondBody.next_cursor).toBeNull();
    });

    it("rejects an invalid cursor", async () => {
        const response = await app.inject({
            method: "GET",
            url: "/logs?cursor=invalid-cursor",
        });

        expect(response.statusCode).toBe(400);

        expect(response.json()).toMatchObject({
            error: "Invalid cursor",
        });
    });

    it("sorts results by timestamp descending", async () => {
        await app.inject({
            method: "POST",
            url: "/logs",
            payload: {
                logs: [
                    {
                        timestamp: "2026-08-14T10:00:00Z",
                        level: "info",
                        service: "sorting-test",
                        message: "Older",
                    },
                    {
                        timestamp: "2026-08-14T12:00:00Z",
                        level: "info",
                        service: "sorting-test",
                        message: "Newer",
                    },
                    {
                        timestamp: "2026-08-14T11:00:00Z",
                        level: "info",
                        service: "sorting-test",
                        message: "Middle",
                    },
                ],
            },
        });

        const response = await app.inject({
            method: "GET",
            url: "/logs?service=sorting-test",
        });

        expect(response.statusCode).toBe(200);

        const body = response.json();

        expect(body.logs).toHaveLength(3);

        expect(body.logs[0].message).toBe("Newer");
        expect(body.logs[1].message).toBe("Middle");
        expect(body.logs[2].message).toBe("Older");
    });
});

