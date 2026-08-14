\# Log Ingestion Service



A high-throughput log ingestion and querying service built with \*\*TypeScript, Fastify, PostgreSQL, Drizzle ORM, Zod, and Docker Compose\*\*.



The service provides:



\* Log ingestion through `POST /logs`

\* Log querying through `GET /logs`

\* Filtering by service and log level

\* Inclusive `since` filtering

\* Exclusive `until` filtering

\* Case-insensitive message search

\* Dynamic attribute filtering

\* Combined filters

\* Cursor-based pagination

\* PostgreSQL persistence

\* Automatic database migrations

\* Docker Compose deployment

\* Automated tests with Vitest



\---



\## Tech Stack



\* \*\*Node.js 22\*\*

\* \*\*TypeScript\*\*

\* \*\*Fastify 5\*\*

\* \*\*PostgreSQL 17\*\*

\* \*\*Drizzle ORM\*\*

\* \*\*Drizzle Kit\*\*

\* \*\*Zod\*\*

\* \*\*Vitest\*\*

\* \*\*Docker / Docker Compose\*\*



\---



\## Architecture



```text

&#x20;                   ┌─────────────────────┐

&#x20;                   │       Client        │

&#x20;                   └──────────┬──────────┘

&#x20;                              │

&#x20;                        HTTP / JSON

&#x20;                              │

&#x20;                              ▼

&#x20;                   ┌─────────────────────┐

&#x20;                   │      Fastify        │

&#x20;                   │                     │

&#x20;                   │ POST /logs          │

&#x20;                   │ GET  /logs          │

&#x20;                   └──────────┬──────────┘

&#x20;                              │

&#x20;               ┌──────────────┴──────────────┐

&#x20;               │                             │

&#x20;               ▼                             ▼

&#x20;       ┌───────────────┐             ┌───────────────┐

&#x20;       │ Zod Validation│             │ Query Service │

&#x20;       └───────┬───────┘             └───────┬───────┘

&#x20;               │                             │

&#x20;               └──────────────┬──────────────┘

&#x20;                              ▼

&#x20;                   ┌─────────────────────┐

&#x20;                   │     Drizzle ORM     │

&#x20;                   └──────────┬──────────┘

&#x20;                              │

&#x20;                              ▼

&#x20;                   ┌─────────────────────┐

&#x20;                   │     PostgreSQL      │

&#x20;                   │                     │

&#x20;                   │       logs          │

&#x20;                   └─────────────────────┘

```



Query construction and persistence logic are separated from the HTTP route handlers.



\---



\## Project Structure



```text

log-ingestion-service/

├── src/

│   ├── db/

│   │   ├── client.ts

│   │   └── schema.ts

│   ├── routes/

│   │   └── logs.ts

│   ├── services/

│   │   └── log-query.service.ts

│   ├── validation/

│   │   └── log.ts

│   ├── app.ts

│   └── server.ts

├── tests/

│   ├── database.test.ts

│   ├── health.test.ts

│   └── logs.test.ts

├── scripts/

│   └── load-test.ts

├── drizzle/

├── Dockerfile

├── docker-compose.yml

├── drizzle.config.ts

├── package.json

└── tsconfig.json

```



\---



\# Getting Started



\## Requirements



\* Node.js 22+

\* npm

\* Docker Desktop / Docker Engine

\* Docker Compose



\---



\## Run with Docker Compose



The simplest way to run the service is:



```bash

docker compose up --build

```



The application will be available at:



```text

http://localhost:8080

```



PostgreSQL is exposed on:



```text

localhost:5432

```



The default database configuration is:



```text

Database: logs

User: postgres

Password: postgres

```



\### First-run migrations



After the containers are running, migrations can be applied with:



```bash

docker compose exec app npx drizzle-kit migrate

```



The command is safe to run again after the migrations have already been applied.



Verify that the table exists:



```bash

docker compose exec postgres psql -U postgres -d logs -c "\\dt"

```



Expected:



```text

public | logs | table

```



\---



\# Environment Variables



The core service uses the following environment variables:



| Variable         | Default          | Description                  |

| ---------------- | ---------------- | ---------------------------- |

| `PORT`           | `8080`           | HTTP server port             |

| `DATABASE\_URL`   | Compose-provided | PostgreSQL connection string |

| `RETENTION\_DAYS` | `30`             | Retention configuration      |



Example:



```env

PORT=8080

DATABASE\_URL=postgres://postgres:postgres@localhost:5432/logs

RETENTION\_DAYS=30

```



\### Optional Features



The implemented optional behavior is:



| Feature                     | Default State                                | Configuration                 |

| --------------------------- | -------------------------------------------- | ----------------------------- |

| Log retention configuration | Enabled/configured with `30` days in Compose | `RETENTION\_DAYS`              |

| Message search              | Available                                    | `q` query parameter           |

| Attribute filtering         | Available                                    | `attr.<key>` query parameters |

| Cursor pagination           | Available                                    | `cursor` query parameter      |



No additional configuration is required to use the core ingestion and query service.



\### Plain Core Service



A standard:



```bash

docker compose up

```



starts the PostgreSQL database and application using the default Compose configuration.



No optional feature requires additional configuration for the core service to start.



\---



\# API



\## POST `/logs`



Creates a new log entry.



\### Request



```http

POST /logs

Content-Type: application/json

```



Example:



```json

{

&#x20; "timestamp": "2026-08-14T12:00:00.000Z",

&#x20; "level": "error",

&#x20; "service": "checkout",

&#x20; "message": "Payment declined",

&#x20; "attributes": {

&#x20;   "user\_id": "42",

&#x20;   "environment": "production"

&#x20; }

}

```



\### Response



```http

201 Created

```



```json

{

&#x20; "id": "2503b50c-b989-4050-9dd6-976e90e3ad89",

&#x20; "timestamp": "2026-08-14T12:00:00.000Z",

&#x20; "level": "error",

&#x20; "service": "checkout",

&#x20; "message": "Payment declined",

&#x20; "attributes": {

&#x20;   "user\_id": "42",

&#x20;   "environment": "production"

&#x20; },

&#x20; "createdAt": "2026-08-14T12:00:00.000Z"

}

```



Invalid request bodies return:



```http

400 Bad Request

```



\---



\# GET `/logs`



Returns logs ordered by:



1\. `timestamp DESC`

2\. `id DESC`



\## Service Filter



```text

GET /logs?service=checkout

```



The service filter uses an exact match.



\## Level Filter



```text

GET /logs?level=error

```



Supported levels:



```text

debug

info

warn

error

```



\## Time Filters



\### Inclusive `since`



```text

GET /logs?since=2026-08-14T12:00:00Z

```



Logs exactly at the `since` timestamp are included.



\### Exclusive `until`



```text

GET /logs?until=2026-08-14T13:00:00Z

```



Logs exactly at the `until` timestamp are excluded.



Both can be combined:



```text

GET /logs?since=2026-08-14T12:00:00Z\&until=2026-08-14T13:00:00Z

```



\---



\## Message Search



The `q` parameter performs a case-insensitive substring search.



```text

GET /logs?q=declined

```



For example, it can match:



```text

Payment declined

PAYMENT DECLINED

payment declined by provider

```



\---



\## Attribute Filtering



Attributes can be queried using:



```text

GET /logs?attr.user\_id=42

```



Multiple attributes can be supplied:



```text

GET /logs?attr.user\_id=42\&attr.environment=production

```



Attribute values are compared for equality.



\---



\## Combining Filters



Filters can be combined:



```text

GET /logs?service=checkout\&level=error\&q=declined\&attr.environment=production

```



The conditions are combined using logical `AND`.



\---



\# Pagination



The endpoint supports cursor-based pagination.



Example:



```text

GET /logs?limit=100

```



Response:



```json

{

&#x20; "logs": \[],

&#x20; "next\_cursor": "..."

}

```



The next page can be requested using:



```text

GET /logs?limit=100\&cursor=<next\_cursor>

```



The cursor contains the last returned timestamp and ID and is encoded using Base64URL.



Pagination is based on:



```text

timestamp DESC, id DESC

```



This provides deterministic ordering even when multiple logs have the same timestamp.



\---



\# Limits



The default query limit is:



```text

100

```



The maximum is:



```text

1000

```



Invalid limits return:



```http

400 Bad Request

```



Invalid dates and unsupported log levels are also rejected with `400 Bad Request`.



\---



\# Database Schema



The main `logs` table contains:



| Column       | Type         | Description                  |

| ------------ | ------------ | ---------------------------- |

| `id`         | UUID         | Primary key                  |

| `timestamp`  | timestamptz  | Event timestamp              |

| `level`      | varchar(20)  | Log level                    |

| `service`    | varchar(100) | Service name                 |

| `message`    | text         | Log message                  |

| `attributes` | jsonb        | Structured attributes        |

| `created\_at` | timestamptz  | Database insertion timestamp |



Indexes are currently provided for:



```text

logs.timestamp

logs.service

logs.level

```



The `attributes` field uses PostgreSQL `jsonb` to support structured metadata without requiring a fixed schema for every possible log attribute.



\---



\# Validation and Reliability



Incoming log payloads are validated using Zod before database insertion.



The API handles:



\* Invalid request bodies

\* Invalid timestamps

\* Invalid query dates

\* Invalid limits

\* Unsupported log levels

\* Invalid cursors

\* Empty query results

\* Combined filters

\* Pagination boundaries



Malformed cursors return:



```text

Invalid cursor

```



Database queries use Drizzle ORM parameterization and do not construct SQL from untrusted values directly.



Dynamic attribute filters are constructed using parameterized SQL expressions.



\---



\# Testing



Run the type checker:



```bash

npm run typecheck

```



Run the complete test suite:



```bash

npm run test:run

```



Current test result:



```text

Test Files  3 passed

Tests       18 passed

```



The test suite covers:



\* Database connectivity

\* Health endpoint

\* Log creation

\* Invalid log rejection

\* Service filtering

\* Level filtering

\* Inclusive `since`

\* Exclusive `until`

\* Message search

\* Attribute filtering

\* Combined filters

\* Default limits

\* Maximum limits

\* Invalid limits

\* Invalid levels

\* Invalid dates

\* Cursor pagination



\---



\# Performance Testing



A custom load generator is included:



```text

scripts/load-test.ts

```



Run:



```bash

npm run load:test

```



The load generator supports:



```text

TOTAL

CONCURRENCY

BASE\_URL

```



Example:



```powershell

$env:TOTAL="100000"

$env:CONCURRENCY="100"

npm run load:test

```



Results are stored under:



```text

load-test-results/

```



\---



\# Measured Load Test Results



\## Test Environment



The benchmark was performed locally using Docker Compose.



Components:



```text

Application: Node.js 22 / Fastify

Database: PostgreSQL 17

Container runtime: Docker Desktop

Host: Windows

```



The local Docker environment was not configured with the evaluator's strict CPU/memory limits, so these results should be considered \*\*local engineering benchmarks\*\*, not proof of meeting the evaluator's constrained environment.



\---



\## Dataset and Test Configuration



Initial benchmark:



```text

Dataset per run: 100,000 logs

Request model: one log per HTTP POST

Concurrency: 100

```



Measured result:



```text

Completed:       100,000

Failed:          0

Duration:        40.431 seconds

Throughput:      2,473.32 logs/sec



p50:             38.11 ms

p95:             54.56 ms

p99:             72.28 ms

max:             473.06 ms

```



Additional concurrency tests:



| Concurrency |    Logs |  Throughput |    p50 |    p95 |    p99 | Failed |

| ----------: | ------: | ----------: | -----: | -----: | -----: | -----: |

|         100 | 100,000 | \*\*2,473/s\*\* |  38 ms |  55 ms |  72 ms |      0 |

|         250 | 100,000 | \*\*2,106/s\*\* | 114 ms | 146 ms | 173 ms |      0 |

|         500 | 100,000 | \*\*2,169/s\*\* | 222 ms | 261 ms | 312 ms |      0 |

|        1000 | 100,000 | \*\*1,964/s\*\* | 489 ms | 550 ms | 778 ms |      0 |



No dropped requests or application crashes were observed during these tests.



\---



\## Resource Usage



During a 100-concurrency ingestion test, observed Docker statistics included approximately:



```text

Application CPU:    102–107%

Application memory: 234–243 MiB



PostgreSQL CPU:     76–77%

PostgreSQL memory:  \~197 MiB

```



These measurements identified application CPU and memory pressure as important bottlenecks under high request concurrency.



\---



\# Performance Bottlenecks



The benchmark identified several bottlenecks:



1\. Each log is currently submitted as an individual HTTP request.

2\. Each request performs validation and database persistence.

3\. Increasing concurrency beyond 100 did not increase throughput.

4\. Application CPU usage exceeded 100% during the benchmark.

5\. Application memory approached the 256 MB target.

6\. PostgreSQL also consumed significant CPU during sustained ingestion.



Increasing concurrency from 100 to 1000 increased latency while reducing throughput:



```text

100 concurrency:

2,473 logs/sec, p95 55 ms



1000 concurrency:

1,964 logs/sec, p95 550 ms

```



This indicates that simply increasing concurrency is not an effective optimization for the current ingestion path.



\---



\# Optimizations Applied



The implementation includes several query-side optimizations:



\* Indexed timestamp queries

\* Indexed service filtering

\* Indexed level filtering

\* Deterministic timestamp + UUID ordering

\* Cursor-based pagination instead of offset pagination

\* Parameterized database queries

\* Query filters assembled in the service layer

\* Bounded query limits

\* PostgreSQL JSONB for structured attributes

\* Validation before database insertion



Cursor pagination uses the last `(timestamp, id)` pair to efficiently locate the next page.



\---



\# Current Performance Status



The current implementation has been measured at approximately:



```text

2,473 logs/sec

```



for the best measured local configuration.



The project specification's baseline target is:



```text

15,000 logs/sec

```



Therefore, the current benchmark \*\*does not claim to meet the 15,000 logs/sec target\*\*.



Further ingestion optimization would likely focus on reducing per-request overhead and database round trips, including investigation of batched ingestion and PostgreSQL connection/persistence tuning.



\---



\# Data Volume



The service was also tested against a database containing approximately:



```text

500,000 stored log records

```



The database remained operational and queryable during the ingestion experiments.



A full 1,000,000-record benchmark and constrained-resource benchmark should be treated as additional validation work rather than inferred from the smaller local tests.



\---



\# Docker Compose



Start the complete stack:



```bash

docker compose up --build

```



Stop it:



```bash

docker compose down

```



Remove containers and the PostgreSQL volume:



```bash

docker compose down -v

```



The PostgreSQL data is persisted through:



```text

postgres\_data

```



\---



\# Development



Install dependencies:



```bash

npm install

```



Run the application in development mode:



```bash

npm run dev

```



Build:



```bash

npm run build

```



Typecheck:



```bash

npm run typecheck

```



Run tests:



```bash

npm run test:run

```



\---



\# Design Decisions



\## PostgreSQL



PostgreSQL was selected because the service requires:



\* Reliable persistence

\* Structured querying

\* Time-based filtering

\* JSON attributes

\* Indexing

\* Transactional writes



\## JSONB Attributes



Attributes are stored as PostgreSQL `jsonb` because log metadata can vary between services.



This avoids creating a separate database column for every possible attribute.



\## Cursor Pagination



Cursor pagination was chosen over offset pagination because offset-based pagination becomes increasingly expensive as the result set grows.



The cursor is based on:



```text

timestamp + id

```



which also provides deterministic ordering when timestamps are equal.



\## Separation of Concerns



HTTP handlers are responsible for:



\* Parsing requests

\* Validating input

\* Returning HTTP responses



Query construction and database retrieval are handled by the query service.



This keeps database logic independent from Fastify route handling.



\---



\# Security



The service avoids building SQL queries by directly concatenating user-provided values.



Database values are parameterized through Drizzle ORM / PostgreSQL query parameters.



Dynamic attribute filters use parameterized SQL values.



Input validation is performed before persistence.



\---



\# Known Limitations



The current implementation has the following known limitations:



\* The measured local ingestion throughput is below the 15,000 logs/sec target.

\* The current ingestion endpoint processes one log per HTTP request.

\* A full 1,000,000-record constrained-resource benchmark has not been completed.

\* Aggregation-query latency under simultaneous sustained 15,000 logs/sec ingestion has not yet been fully benchmarked.

\* Retention behavior requires additional production-scale benchmarking.

\* The local Docker benchmark does not use the exact evaluator CPU/memory limits.



These limitations are documented intentionally rather than presenting unmeasured performance claims.



\---



\# Conclusion



The project implements the core log ingestion and querying functionality with:



\* TypeScript

\* Fastify

\* PostgreSQL

\* Drizzle ORM

\* Zod validation

\* Docker Compose

\* Automated tests

\* Indexed queries

\* JSONB attributes

\* Cursor pagination

\* Load testing and measured performance results



The current measured baseline provides a reproducible starting point for further performance optimization while maintaining correctness and reliability.



