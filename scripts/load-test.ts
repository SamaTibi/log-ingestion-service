import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const TOTAL = Number(process.env.TOTAL ?? 100_000);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 100);

const latencies: number[] = [];

let completed = 0;
let failed = 0;
let nextIndex = 0;

function percentile(values: number[], percentile: number): number {
    if (values.length === 0) {
        return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);

    const index = Math.min(
        sorted.length - 1,
        Math.ceil((percentile / 100) * sorted.length) - 1,
    );

    return sorted[index];
}

function createLog(index: number) {
    return {
        timestamp: new Date(
            Date.now() - (index % (30 * 24 * 60 * 60 * 1000)),
        ).toISOString(),

        level: index % 20 === 0 ? "error" : "info",

        service: "load-test",

        message: `load test message ${index} payment completed`,

        attributes: {
            test_run: "baseline",
            user_id: String(index % 10_000),
            environment: "load-test",
        },
    };
}

async function sendLog(index: number) {
    const start = performance.now();

    try {
        const response = await fetch(`${BASE_URL}/logs`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify(createLog(index)),
        });

        const latency = performance.now() - start;

        latencies.push(latency);

        if (!response.ok) {
            failed++;
            await response.text();
        }

        completed++;
    } catch (error) {
        failed++;
        completed++;

        console.error("Request failed:", error);
    }
}

async function worker() {
    while (true) {
        const index = nextIndex++;

        if (index >= TOTAL) {
            return;
        }

        await sendLog(index);
    }
}

async function main() {
    console.log("=================================");
    console.log("Log Ingestion Load Test");
    console.log("=================================");
    console.log(`BASE_URL:    ${BASE_URL}`);
    console.log(`TOTAL:       ${TOTAL}`);
    console.log(`CONCURRENCY: ${CONCURRENCY}`);
    console.log("");

    const start = performance.now();

    await Promise.all(
        Array.from(
            { length: CONCURRENCY },
            () => worker(),
        ),
    );

    const durationSeconds =
        (performance.now() - start) / 1000;

    const rate = completed / durationSeconds;

    const result = {
        timestamp: new Date().toISOString(),

        configuration: {
            baseUrl: BASE_URL,
            total: TOTAL,
            concurrency: CONCURRENCY,
        },

        results: {
            completed,
            failed,
            durationSeconds: Number(
                durationSeconds.toFixed(3),
            ),
            logsPerSecond: Number(
                rate.toFixed(2),
            ),
        },

        latencyMs: {
            p50: Number(
                percentile(latencies, 50).toFixed(2),
            ),
            p95: Number(
                percentile(latencies, 95).toFixed(2),
            ),
            p99: Number(
                percentile(latencies, 99).toFixed(2),
            ),
            max: Number(
                Math.max(...latencies).toFixed(2),
            ),
        },
    };

    await mkdir("load-test-results", {
        recursive: true,
    });

    const filename =
        `load-test-results/result-${Date.now()}.json`;

    await writeFile(
        filename,
        JSON.stringify(result, null, 2),
    );

    console.log("");
    console.log("=================================");
    console.log("RESULT");
    console.log("=================================");
    console.log(
        JSON.stringify(result, null, 2),
    );
    console.log("");
    console.log(`Saved to: ${filename}`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}

await main();