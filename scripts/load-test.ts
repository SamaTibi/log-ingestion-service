import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL =
  process.env.BASE_URL ?? "http://localhost:8080";

const TOTAL =
  Number(process.env.TOTAL ?? 100_000);

const CONCURRENCY =
  Number(process.env.CONCURRENCY ?? 100);

const BATCH_SIZE =
  Number(process.env.BATCH_SIZE ?? 100);

interface LoadTestResult {
  completedLogs: number;
  completedRequests: number;
  failedRequests: number;
  durationSeconds: number;
  logsPerSecond: number;
  requestsPerSecond: number;
  latencyMs: {
    p50: number;
    p95: number;
    p99: number;
    max: number;
  };
}

function percentile(
  values: number[],
  percentileValue: number,
): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);

  const index = Math.ceil(
    (percentileValue / 100) * sorted.length,
  ) - 1;

  return sorted[Math.max(0, index)];
}

function createLog(index: number) {
  return {
    timestamp: new Date().toISOString(),
    level: "info",
    service: "load-test",
    message: `load test log ${index}`,
    attributes: {
      index,
      environment: "load-test",
    },
  };
}

async function sendBatch(
  startIndex: number,
  batchSize: number,
): Promise<{
  success: boolean;
  latency: number;
  accepted: number;
}> {
  const logs = [];

  for (
    let i = startIndex;
    i < startIndex + batchSize && i < TOTAL;
    i++
  ) {
    logs.push(createLog(i));
  }

  const start = performance.now();

  try {
    const response = await fetch(`${BASE_URL}/logs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        logs,
      }),
    });

    const latency = performance.now() - start;

    if (!response.ok) {
      return {
        success: false,
        latency,
        accepted: 0,
      };
    }

    const body = (await response.json()) as {
      accepted?: number;
    };

    return {
      success: true,
      latency,
      accepted: body.accepted ?? 0,
    };
  } catch {
    return {
      success: false,
      latency: performance.now() - start,
      accepted: 0,
    };
  }
}

async function main() {
  console.log("=================================");
  console.log("Log Ingestion Batch Load Test");
  console.log("=================================");
  console.log(`BASE_URL:    ${BASE_URL}`);
  console.log(`TOTAL LOGS:  ${TOTAL}`);
  console.log(`BATCH_SIZE:  ${BATCH_SIZE}`);
  console.log(`CONCURRENCY: ${CONCURRENCY}`);
  console.log("");

  const totalBatches = Math.ceil(TOTAL / BATCH_SIZE);

  let nextBatch = 0;
  let completedLogs = 0;
  let completedRequests = 0;
  let failedRequests = 0;

  const latencies: number[] = [];

  const start = performance.now();

  async function worker() {
    while (true) {
      const batchIndex = nextBatch++;

      if (batchIndex >= totalBatches) {
        return;
      }

      const startIndex = batchIndex * BATCH_SIZE;

      const result = await sendBatch(
        startIndex,
        BATCH_SIZE,
      );

      latencies.push(result.latency);

      if (result.success) {
        completedRequests++;
        completedLogs += result.accepted;
      } else {
        failedRequests++;
      }
    }
  }

  const workers = [];

  const workerCount = Math.min(
    CONCURRENCY,
    totalBatches,
  );

  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const durationSeconds =
    (performance.now() - start) / 1000;

  const result: LoadTestResult = {
    completedLogs,
    completedRequests,
    failedRequests,
    durationSeconds: Number(
      durationSeconds.toFixed(3),
    ),
    logsPerSecond: Number(
      (completedLogs / durationSeconds).toFixed(2),
    ),
    requestsPerSecond: Number(
      (completedRequests / durationSeconds).toFixed(2),
    ),
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

  console.log("");
  console.log("=================================");
  console.log("RESULT");
  console.log("=================================");

  console.log(
    JSON.stringify(result, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});