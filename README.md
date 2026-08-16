# 🚀 Log Ingestion Service

**A production-oriented log ingestion and querying API built with TypeScript, Fastify, PostgreSQL, Drizzle ORM, and Zod.**

Designed for reliable structured-log ingestion, efficient querying, JSONB attributes, filtering, search, cursor pagination, and performance testing.

<p align="center">

**TypeScript** · **Fastify** · **PostgreSQL 17** · **Drizzle ORM** · **Zod** · **Vitest** · **Docker**

</p>

---

## ✨ Features

* ⚡ High-throughput log ingestion
* 📦 Batch log ingestion
* 🗄️ PostgreSQL persistence
* 🛡️ Zod request validation
* 🔎 Service and log-level filtering
* 🕐 Time-range filtering
* 🔤 Case-insensitive message search
* 🧩 JSONB attribute filtering
* 🔗 Combined query filters
* 📄 Cursor-based pagination
* 📊 Deterministic result ordering
* 🚀 Database indexes for common query patterns
* 🐳 Docker Compose environment
* 🔄 Drizzle database migrations
* 🧪 Automated test suite
* 📈 Built-in load-testing script
* 📊 Measured performance benchmarks
* ⏱️ Future timestamp validation
* 🔀 Independent validation and rejection of logs inside batches

---

## 🧰 Tech Stack

| Technology         | Purpose                        |
| ------------------ | ------------------------------ |
| **TypeScript**     | Application language           |
| **Fastify**        | HTTP server                    |
| **PostgreSQL 17**  | Persistent storage             |
| **Drizzle ORM**    | Database access and migrations |
| **Zod**            | Request validation             |
| **Vitest**         | Automated testing              |
| **Docker Compose** | Local deployment               |

---

## 🚀 Quick Start

### Requirements

* Node.js 22+
* npm
* Docker Desktop or Docker Engine
* Docker Compose

### 1. Clone the repository

```bash
git clone https://github.com/SamaTibi/log-ingestion-service.git
cd log-ingestion-service
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start PostgreSQL

```bash
docker compose up -d postgres
```

### 4. Apply database migrations

```bash
npm run migrate
```

The migration command runs:

```bash
drizzle-kit migrate
```

### 5. Start the development server

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:8080
```

PostgreSQL:

```text
localhost:5432
```

### Verify the database

```bash
docker compose exec postgres psql -U postgres -d logs -c "\dt"
```

You should see:

```text
 Schema | Name | Type  | Owner
--------+------+-------+--------
 public | logs | table | postgres
```

---

## ⚙️ Configuration

The application uses environment variables for configuration.

| Variable         | Default       | Description                  |
| ---------------- | ------------- | ---------------------------- |
| `PORT`           | `8080`        | HTTP server port             |
| `DATABASE_URL`   | Compose value | PostgreSQL connection string |
| `RETENTION_DAYS` | `30`          | Log retention configuration  |

Example:

```env
PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/logs
RETENTION_DAYS=30
```

---

## 🏗️ Architecture

```text
                         ┌──────────────┐
                         │    Client    │
                         └──────┬───────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Fastify     │
                       │                 │
                       │ POST /logs      │
                       │ GET  /logs      │
                       └────────┬────────┘
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
                 ▼                             ▼
          ┌──────────────┐             ┌───────────────┐
          │     Zod      │             │ Query Service │
          │  Validation  │             │               │
          └──────┬───────┘             └───────┬───────┘
                 │                             │
                 └──────────────┬──────────────┘
                                ▼
                         ┌───────────────┐
                         │ Drizzle ORM   │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │  PostgreSQL   │
                         │     logs      │
                         └───────────────┘
```

The application is separated into clear layers:

* **Routes** handle HTTP requests and responses.
* **Validation** handles incoming request validation.
* **Services** contain ingestion and query logic.
* **Drizzle ORM** handles database access.
* **PostgreSQL** provides persistence and indexing.

---

## 📁 Project Structure

```text
log-ingestion-service/
│
├── src/
│   ├── db/
│   │   ├── client.ts
│   │   ├── schema.ts
│   │   └── migrations/
│   │       ├── 0000_*.sql
│   │       ├── 0001_*.sql
│   │       ├── 0002_*.sql
│   │       └── meta/
│   │
│   ├── routes/
│   │   └── logs.ts
│   │
│   ├── services/
│   │   ├── log-ingestion.service.ts
│   │   └── log-query.service.ts
│   │
│   ├── types/
│   │   └── logs.ts
│   │
│   ├── validation/
│   │   └── log.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── tests/
│   ├── database.test.ts
│   ├── health.test.ts
│   ├── logs.test.ts
│   └── helpers/
│       └── reset-database.ts
│
├── scripts/
│   └── load-test.ts
│
├── load-test-results/
│
├── Dockerfile
├── docker-compose.yml
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

# 📡 API

The service exposes two main endpoints:

```text
POST /logs
GET  /logs
```

---

# 📝 Create Logs

## POST `/logs`

The API expects a top-level `logs` array.

A single log is represented as an array containing one item.

```http
POST /logs
Content-Type: application/json
```

### Request

```json
{
  "logs": [
    {
      "timestamp": "2026-08-14T12:00:00.000Z",
      "level": "error",
      "service": "checkout",
      "message": "Payment declined",
      "attributes": {
        "user_id": "42",
        "environment": "production"
      }
    }
  ]
}
```

### Successful response

```http
200 OK
```

```json
{
  "accepted": 1,
  "rejected": []
}
```

The API processes logs independently.

---

# 📦 Batch Log Ingestion

Multiple logs can be submitted in one request.

```http
POST /logs
Content-Type: application/json
```

### Request

```json
{
  "logs": [
    {
      "timestamp": "2026-08-14T12:00:00.000Z",
      "level": "info",
      "service": "checkout",
      "message": "Payment started",
      "attributes": {
        "user_id": "42"
      }
    },
    {
      "timestamp": "2026-08-14T12:01:00.000Z",
      "level": "error",
      "service": "checkout",
      "message": "Payment declined",
      "attributes": {
        "user_id": "43"
      }
    }
  ]
}
```

### Successful response

```http
200 OK
```

```json
{
  "accepted": 2,
  "rejected": []
}
```

Each log is validated independently.

For example, if one log is invalid and another is valid:

```json
{
  "accepted": 1,
  "rejected": [
    {
      "index": 0,
      "reason": "..."
    }
  ]
}
```

The valid log is still stored.

If every log in the request is rejected, the API returns:

```http
400 Bad Request
```

Example:

```json
{
  "accepted": 0,
  "rejected": [
    {
      "index": 0,
      "reason": "..."
    }
  ]
}
```

---

## ⏱️ Future Timestamp Validation

Logs are allowed to have timestamps up to **5 minutes in the future**.

Logs that are more than 5 minutes in the future are rejected.

Example:

```json
{
  "index": 0,
  "reason": "timestamp cannot be more than 5 minutes in the future"
}
```

Future-dated logs are rejected independently without preventing valid logs in the same batch from being stored.

---

## 🛡️ Request Validation

Every incoming log is validated with Zod before persistence.

Invalid logs are rejected individually.

The API validates:

* Timestamp
* Log level
* Service
* Message
* Attributes

Supported log levels are:

```text
debug
info
warn
error
```

The top-level request must contain a `logs` array.

Invalid request structures return:

```http
400 Bad Request
```

---

# 🔎 Query Logs

## GET `/logs`

The endpoint supports filtering, searching, and cursor-based pagination.

Results are ordered deterministically by:

```text
timestamp DESC
id DESC
```

---

## 🎯 Service Filtering

```text
GET /logs?service=checkout
```

Performs exact service matching.

---

## 🚦 Level Filtering

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

---

## 🕐 Time Range Filtering

### `since`

`since` is inclusive.

```text
GET /logs?since=2026-08-14T12:00:00Z
```

Logs at exactly the `since` timestamp are included.

### `until`

`until` is exclusive.

```text
GET /logs?until=2026-08-14T13:00:00Z
```

Logs at exactly the `until` timestamp are excluded.

### Combined

Both can be combined:

```text
GET /logs?since=2026-08-14T12:00:00Z&until=2026-08-14T13:00:00Z
```

---

# 🔤 Message Search

Use `q` for case-insensitive substring matching.

```text
GET /logs?q=declined
```

Example:

```text
GET /logs?service=checkout&q=payment
```

---

# 🧩 Attribute Filtering

Attributes are stored as PostgreSQL JSONB.

Filter using:

```text
GET /logs?attr.user_id=42
```

Multiple attributes can be combined:

```text
GET /logs?attr.user_id=42&attr.environment=production
```

---

# 🔗 Combined Filters

All supported filters can be combined.

```text
GET /logs?service=checkout&level=error&q=declined&attr.environment=production
```

Filters are combined using `AND`.

---

# 📄 Cursor Pagination

The API uses cursor-based pagination instead of large SQL offsets.

First request:

```text
GET /logs?limit=100
```

Example response:

```json
{
  "logs": [],
  "next_cursor": "..."
}
```

Request the next page:

```text
GET /logs?limit=100&cursor=<next_cursor>
```

The cursor represents the last:

```text
(timestamp, id)
```

pair from the previous page.

This provides deterministic pagination and avoids the scalability problems associated with large SQL offsets.

## Pagination Limits

| Setting |  Value |
| ------- | -----: |
| Minimum |    `1` |
| Default |  `100` |
| Maximum | `1000` |

---

# 🗄️ Database

The main `logs` table contains:

| Column       | Type        | Purpose             |
| ------------ | ----------- | ------------------- |
| `id`         | UUID        | Primary key         |
| `timestamp`  | timestamptz | Event timestamp     |
| `level`      | enum        | Log severity        |
| `service`    | text        | Service name        |
| `message`    | text        | Log message         |
| `attributes` | jsonb       | Structured metadata |
| `created_at` | timestamptz | Insert timestamp    |

## Indexes

```text
logs_timestamp_idx
logs_service_idx
logs_level_idx
```

The timestamp index supports time-based queries, while service and level indexes support common equality filters.

---

# 🛡️ Validation & Security

Incoming requests are validated with Zod before persistence.

The API rejects:

* Invalid request bodies
* Invalid timestamps
* Timestamps more than 5 minutes in the future
* Invalid `since` / `until` values
* Invalid limits
* Unsupported log levels
* Invalid cursors

Database queries use parameterized operations through Drizzle ORM and PostgreSQL.

User-controlled values are not concatenated directly into SQL queries.

Dynamic JSONB attribute filters are also parameterized.

---

# 🧪 Testing

Typecheck:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

Run the complete test suite:

```bash
npm run test:run
```

Current verified result:

```text
Test Files  3 passed
Tests       18 passed
```

The test suite covers:

* Database connectivity
* Health endpoint
* Single-log batch creation
* Multiple valid logs
* Invalid input
* Future timestamps
* Independent log rejection
* Large batches
* Service filtering
* Level filtering
* `since`
* `until`
* Message search
* Attribute filtering
* Combined filters
* Query limits
* Invalid parameters
* Cursor pagination

---

# 📊 Load Testing

A custom load generator is included:

```text
scripts/load-test.ts
```

Run:

```bash
npm run load:test
```

Configure the test:

```powershell
$env:TOTAL="100000"
$env:CONCURRENCY="100"
npm run load:test
```

Optional batch configuration:

```powershell
$env:BATCH_SIZE="100"
npm run load:test
```

Results are written to:

```text
load-test-results/
```

The result directory is ignored by Git because benchmark output is generated locally.

---

# 📈 Measured Performance

> These are measured local benchmarks, not theoretical estimates.

## Best Recorded Result

| Metric      |           Result |
| ----------- | ---------------: |
| Logs        |        `100,000` |
| Concurrency |            `100` |
| Completed   |        `100,000` |
| Failed      |            **0** |
| Duration    |       `40.431 s` |
| Throughput  | **2,473 logs/s** |
| p50         |       `38.11 ms` |
| p95         |       `54.56 ms` |
| p99         |       `72.28 ms` |
| Max         |      `473.06 ms` |

## Concurrency Comparison

| Concurrency |  Throughput |    p50 |    p95 |    p99 | Failed |
| ----------: | ----------: | -----: | -----: | -----: | -----: |
|       `100` | **2,473/s** |  38 ms |  55 ms |  72 ms |      0 |
|       `250` |     2,106/s | 114 ms | 146 ms | 173 ms |      0 |
|       `500` |     2,169/s | 222 ms | 261 ms | 312 ms |      0 |
|      `1000` |     1,964/s | 489 ms | 550 ms | 778 ms |      0 |

The results show that increasing concurrency beyond approximately 100 increases latency without providing a corresponding throughput improvement.

---

# 🖥️ Resource Usage

Observed during sustained ingestion:

| Resource |  Application | PostgreSQL |
| -------- | -----------: | ---------: |
| CPU      |    ~102–107% |    ~76–77% |
| Memory   | ~234–243 MiB |   ~197 MiB |

The application approached the evaluator's 256 MiB memory limit.

This indicates that application CPU/memory pressure and per-request database overhead are important optimization areas.

---

# 📦 Data Volume

During testing, the database reached approximately:

```text
500,011 stored log records
```

The database remained operational and queryable during the ingestion experiments.

---

# 🎯 Performance Requirements

The target evaluation environment specifies:

| Requirement                    |        Target |
| ------------------------------ | ------------: |
| Sustained ingestion            | 15,000 logs/s |
| Application memory             |        256 MB |
| PostgreSQL memory              |          1 GB |
| Stored records                 |    ~1,000,000 |
| Query latency                  |      <1 s p95 |
| Newly ingested data visibility |         <20 s |
| Aggregation frequency          |     1 query/s |

## Current Measured Status

The current local benchmark reached:

```text
2,473 logs/s
```

with:

```text
0 failed requests
0 observed application crashes
```

The current implementation **has not yet demonstrated the 15,000 logs/s target**.

Performance results are documented based on actual measurements rather than assumptions.

---

# ⚡ Optimizations Implemented

The current implementation includes:

* Timestamp indexing
* Service indexing
* Level indexing
* Cursor pagination
* Deterministic ordering
* Bounded query limits
* JSONB structured attributes
* Parameterized SQL
* Separate query services
* Request validation
* Batch ingestion support
* Independent batch-log rejection
* Future timestamp validation
* Automated database migrations
* PostgreSQL connection timeout configuration
* PostgreSQL idle connection timeout configuration

---

# 🔍 Bottlenecks Discovered

Load testing identified several bottlenecks:

1. Individual HTTP requests create significant per-log overhead.
2. Validation adds CPU work per request.
3. Database writes create per-request database overhead.
4. Application CPU reaches approximately 100% under high concurrency.
5. Application memory approaches the 256 MB evaluation limit.
6. Increasing concurrency beyond 100 increases latency without improving throughput proportionally.

The most promising next optimization is reducing per-request overhead through larger ingestion batches and more efficient database write strategies.

---

# 🐳 Docker

Start the complete stack:

```bash
docker compose up --build
```

Run in the background:

```bash
docker compose up -d
```

Stop:

```bash
docker compose down
```

Remove containers and database volume:

```bash
docker compose down -v
```

Apply migrations:

```bash
npm run migrate
```

Check stored records:

```bash
docker compose exec postgres psql -U postgres -d logs -c "SELECT COUNT(*) FROM logs;"
```

---

# 💻 Local Development

Install dependencies:

```bash
npm install
```

Development server:

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

Tests:

```bash
npm run test:run
```

Load test:

```bash
npm run load:test
```

Database migrations:

```bash
npm run migrate
```

---

# 🧠 Design Decisions

## PostgreSQL

PostgreSQL provides reliable persistence, indexing, JSONB support, and efficient time-based querying.

## JSONB

Log attributes are stored as JSONB because different services may produce different metadata.

## Cursor Pagination

Pagination uses `(timestamp, id)` instead of large offsets, providing deterministic ordering and better scalability.

## Service Layer

Query and ingestion logic are separated from Fastify handlers to keep HTTP concerns independent from database operations.

## Zod Validation

Incoming data is validated before it reaches the persistence layer.

## Parameterized Queries

User-controlled values are passed through parameterized database operations to reduce SQL injection risk.

## Batch Ingestion

Batch requests allow multiple logs to be processed in one HTTP request while still allowing individual invalid logs to be rejected independently.

## Independent Rejection

Each log in a batch is validated independently. A rejected log does not prevent valid logs from being persisted.

---

# ⚠️ Known Limitations

The following areas require additional optimization or benchmarking:

* Current measured ingestion throughput is below the 15,000 logs/s target.
* Large-scale performance under the evaluator's exact resource limits has not been fully demonstrated.
* A complete 1,000,000-record benchmark under evaluator constraints has not been completed.
* Aggregation latency under simultaneous sustained 15,000 logs/s ingestion has not been fully benchmarked.
* Retention behavior requires additional production-scale testing.
* Local Docker resource limits differ from the evaluator environment.
* Further batching and database-write optimization may be required to reach the target throughput.

These limitations are documented explicitly rather than presenting unmeasured performance claims.

---

# 📌 Summary

The Log Ingestion Service provides a structured-log ingestion and query API with:

**Reliable ingestion · Batch processing · PostgreSQL persistence · JSONB attributes · Filtering · Search · Cursor pagination · Validation · Docker deployment · Database migrations · Automated tests · Load testing**

The implementation has been tested with:

```text
500k+ stored records
100k-request ingestion runs
0 failed requests in recorded benchmarks
18 automated tests
```

The current measured throughput is:

```text
2,473 logs/s
```

Further performance improvements would primarily focus on reducing per-request overhead, optimizing database writes, and maximizing the benefits of batch ingestion.
