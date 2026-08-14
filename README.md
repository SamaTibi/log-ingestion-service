\# Log Ingestion Service



A production-oriented \*\*log ingestion and querying API\*\* built with TypeScript, Fastify, PostgreSQL, and Drizzle ORM.



The service is designed around reliable ingestion, structured log attributes, efficient time-based querying, filtering, and cursor pagination.



\---



\## ✨ Features



\* High-throughput log ingestion

\* PostgreSQL persistence

\* Request validation with Zod

\* Service and level filtering

\* Time-range filtering

\* Case-insensitive message search

\* JSONB attribute filtering

\* Combined query filters

\* Cursor-based pagination

\* Deterministic result ordering

\* Database indexes for common query patterns

\* Docker Compose environment

\* Drizzle database migrations

\* Automated test suite

\* Built-in load-testing script

\* Measured performance results



\---



\## 🧰 Tech Stack



| Technology         | Purpose              |

| ------------------ | -------------------- |

| \*\*TypeScript\*\*     | Application language |

| \*\*Fastify\*\*        | HTTP server          |

| \*\*PostgreSQL 17\*\*  | Persistent storage   |

| \*\*Drizzle ORM\*\*    | Database access      |

| \*\*Zod\*\*            | Request validation   |

| \*\*Vitest\*\*         | Automated testing    |

| \*\*Docker Compose\*\* | Local deployment     |



\---



\# 🚀 Quick Start



\### Requirements



\* Node.js 22+

\* npm

\* Docker Desktop or Docker Engine

\* Docker Compose



\### 1. Clone the repository



```bash

git clone https://github.com/SamaTibi/log-ingestion-service.git

cd log-ingestion-service

```



\### 2. Start the stack



```bash

docker compose up --build

```



The API will be available at:



```text

http://localhost:8080

```



PostgreSQL:



```text

localhost:5432

```



\### 3. Apply database migrations



In another terminal:



```bash

docker compose exec app npx drizzle-kit migrate

```



Verify the database:



```bash

docker compose exec postgres psql -U postgres -d logs -c "\\dt"

```



You should see:



```text

&#x20;Schema | Name | Type  | Owner

\--------+------+-------+--------

&#x20;public | logs | table | postgres

```



\---



\# ⚙️ Configuration



The default Docker Compose setup requires no additional configuration.



| Variable         | Default       | Description                  |

| ---------------- | ------------- | ---------------------------- |

| `PORT`           | `8080`        | HTTP server port             |

| `DATABASE\_URL`   | Compose value | PostgreSQL connection string |

| `RETENTION\_DAYS` | `30`          | Retention configuration      |



Example:



```env

PORT=8080

DATABASE\_URL=postgres://postgres:postgres@localhost:5432/logs

RETENTION\_DAYS=30

```



\## Optional Features



| Feature                     | Default   | Configuration    |

| --------------------------- | --------- | ---------------- |

| Message search              | Available | `q`              |

| Attribute filtering         | Available | `attr.<key>`     |

| Cursor pagination           | Available | `cursor`         |

| Log retention configuration | `30 days` | `RETENTION\_DAYS` |



Running:



```bash

docker compose up

```



with no additional configuration starts the \*\*plain core service\*\* with its default configuration.



\---



\# 🏗️ Architecture



```text

&#x20;                        ┌──────────────┐

&#x20;                        │    Client    │

&#x20;                        └──────┬───────┘

&#x20;                               │

&#x20;                               ▼

&#x20;                      ┌─────────────────┐

&#x20;                      │     Fastify     │

&#x20;                      │                 │

&#x20;                      │ POST /logs      │

&#x20;                      │ GET  /logs      │

&#x20;                      └────────┬────────┘

&#x20;                               │

&#x20;                  ┌────────────┴────────────┐

&#x20;                  │                         │

&#x20;                  ▼                         ▼

&#x20;           ┌──────────────┐         ┌───────────────┐

&#x20;           │ Zod          │         │ Query Service │

&#x20;           │ Validation   │         │               │

&#x20;           └──────┬───────┘         └───────┬───────┘

&#x20;                  │                         │

&#x20;                  └────────────┬────────────┘

&#x20;                               ▼

&#x20;                        ┌───────────────┐

&#x20;                        │ Drizzle ORM   │

&#x20;                        └───────┬───────┘

&#x20;                                │

&#x20;                                ▼

&#x20;                        ┌───────────────┐

&#x20;                        │  PostgreSQL   │

&#x20;                        │     logs      │

&#x20;                        └───────────────┘

```



The HTTP layer handles request parsing and validation, while query and persistence logic are kept in separate services.



\---



\# 📁 Project Structure



```text

log-ingestion-service/

│

├── src/

│   ├── db/

│   │   ├── client.ts

│   │   └── schema.ts

│   │

│   ├── routes/

│   │   └── logs.ts

│   │

│   ├── services/

│   │   └── log-query.service.ts

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

│   └── logs.test.ts

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



\---



\# 📡 API



\## Create a Log



\### `POST /logs`



```http

POST /logs

Content-Type: application/json

```



Example request:



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

&#x20; }

}

```



Invalid request bodies return:



```http

400 Bad Request

```



\---



\# 🔎 Query Logs



\### `GET /logs`



Results are ordered by:



```text

timestamp DESC

id DESC

```



\---



\## Service



```text

GET /logs?service=checkout

```



Exact service matching.



\---



\## Level



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



\---



\## Time Range



\### Inclusive `since`



```text

GET /logs?since=2026-08-14T12:00:00Z

```



Logs at exactly the `since` timestamp are included.



\### Exclusive `until`



```text

GET /logs?until=2026-08-14T13:00:00Z

```



Logs at exactly the `until` timestamp are excluded.



Both can be combined:



```text

GET /logs?since=2026-08-14T12:00:00Z\&until=2026-08-14T13:00:00Z

```



\---



\## Message Search



Use `q` for case-insensitive substring matching:



```text

GET /logs?q=declined

```



\---



\## Attributes



Attributes are stored as PostgreSQL JSONB.



Filter using:



```text

GET /logs?attr.user\_id=42

```



Multiple attributes:



```text

GET /logs?attr.user\_id=42\&attr.environment=production

```



\---



\## Combined Filters



All supported filters can be combined:



```text

GET /logs?service=checkout\&level=error\&q=declined\&attr.environment=production

```



Filters are combined using `AND`.



\---



\# 📄 Pagination



The API uses cursor-based pagination.



Request:



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



Request the next page:



```text

GET /logs?limit=100\&cursor=<next\_cursor>

```



The cursor represents the last `(timestamp, id)` pair from the previous page.



This avoids the scalability problems associated with large SQL offsets.



\### Limits



| Setting |  Value |

| ------- | -----: |

| Default |  `100` |

| Maximum | `1000` |

| Minimum |    `1` |



\---



\# 🗄️ Database



The `logs` table contains:



| Column       | Type          | Purpose             |

| ------------ | ------------- | ------------------- |

| `id`         | UUID          | Primary key         |

| `timestamp`  | `timestamptz` | Event timestamp     |

| `level`      | varchar       | Log severity        |

| `service`    | varchar       | Service name        |

| `message`    | text          | Log message         |

| `attributes` | jsonb         | Structured metadata |

| `created\_at` | timestamptz   | Insert timestamp    |



\### Indexes



```text

logs\_timestamp\_idx

logs\_service\_idx

logs\_level\_idx

```



The timestamp index supports time-based queries, while service and level indexes support the most common equality filters.



\---



\# 🛡️ Validation \& Security



Incoming requests are validated with Zod before persistence.



The API rejects:



\* Invalid request bodies

\* Invalid timestamps

\* Invalid `since` / `until` values

\* Invalid limits

\* Unsupported log levels

\* Invalid cursors



Database queries are parameterized through Drizzle ORM and PostgreSQL.



User-controlled values are not concatenated directly into SQL queries.



Dynamic attribute filtering uses parameterized SQL expressions.



\---



\# 🧪 Testing



Typecheck:



```bash

npm run typecheck

```



Run tests:



```bash

npm run test:run

```



Current result:



```text

Test Files  3 passed

Tests       18 passed

```



The test suite covers:



\* Database connectivity

\* Health endpoint

\* Log creation

\* Invalid input

\* Service filtering

\* Level filtering

\* `since`

\* `until`

\* Message search

\* Attribute filtering

\* Combined filters

\* Query limits

\* Invalid parameters

\* Cursor pagination



\---



\# 📊 Load Testing



A custom load generator is included:



```text

scripts/load-test.ts

```



Run it with:



```bash

npm run load:test

```



Configure the test using environment variables:



```powershell

$env:TOTAL="100000"

$env:CONCURRENCY="100"

npm run load:test

```



Results are written to:



```text

load-test-results/

```



\---



\# 📈 Measured Results



> These are measured local benchmarks, not theoretical estimates.



\## Best Result



| Metric      |           Result |

| ----------- | ---------------: |

| Logs        |          100,000 |

| Concurrency |              100 |

| Completed   |          100,000 |

| Failed      |            \*\*0\*\* |

| Duration    |         40.431 s |

| Throughput  | \*\*2,473 logs/s\*\* |

| p50         |         38.11 ms |

| p95         |         54.56 ms |

| p99         |         72.28 ms |

| Max         |        473.06 ms |



\### Concurrency Comparison



| Concurrency |  Throughput |    p50 |    p95 |    p99 | Failed |

| ----------: | ----------: | -----: | -----: | -----: | -----: |

|         100 | \*\*2,473/s\*\* |  38 ms |  55 ms |  72 ms |      0 |

|         250 |     2,106/s | 114 ms | 146 ms | 173 ms |      0 |

|         500 |     2,169/s | 222 ms | 261 ms | 312 ms |      0 |

|        1000 |     1,964/s | 489 ms | 550 ms | 778 ms |      0 |



The results show that increasing concurrency beyond 100 increases latency without improving throughput.



\---



\# 🖥️ Resource Usage



Observed during sustained ingestion:



| Resource |  Application | PostgreSQL |

| -------- | -----------: | ---------: |

| CPU      |    \~102–107% |    \~76–77% |

| Memory   | \~234–243 MiB |   \~197 MiB |



The application was approaching the evaluator's 256 MiB application memory limit.



The measurements indicate that application CPU/memory pressure and per-request database overhead are important areas for further optimization.



\---



\# 📦 Data Volume



During testing, the database reached approximately:



```text

500,011 stored log records

```



The database remained operational and queryable during the ingestion experiments.



\---



\# ⚡ Performance Requirements



The target evaluation environment specifies:



| Requirement                    |        Target |

| ------------------------------ | ------------: |

| Sustained ingestion            | 15,000 logs/s |

| Application memory             |        256 MB |

| PostgreSQL memory              |          1 GB |

| Stored records                 |    \~1,000,000 |

| Query latency                  |      <1 s p95 |

| Newly ingested data visibility |         <20 s |

| Aggregation frequency          |     1 query/s |



\### Current measured status



The current local benchmark reached:



```text

2,473 logs/s

```



with:



```text

0 failed requests

0 observed application crashes

```



The current implementation therefore \*\*has not yet demonstrated the 15,000 logs/s target\*\*.



The benchmark results are included deliberately so performance claims are based on measurements rather than assumptions.



\---



\# 🔧 Optimizations Implemented



The current implementation includes:



\* Timestamp indexing

\* Service indexing

\* Level indexing

\* Cursor pagination

\* Deterministic ordering

\* Bounded query limits

\* JSONB structured attributes

\* Parameterized SQL

\* Separate query service

\* Request validation

\* Automated database migrations



\---



\# 🔍 Bottlenecks Discovered



Load testing showed:



1\. Individual HTTP requests create significant per-log overhead.

2\. Validation adds CPU work per request.

3\. Database writes are performed for every individual log.

4\. Application CPU reaches approximately 100% under high concurrency.

5\. Application memory approaches the 256 MB evaluation limit.

6\. Increasing concurrency beyond 100 increases latency rather than throughput.



The most promising next optimization would be reducing per-request overhead through batched ingestion and database writes.



\---



\# 🐳 Docker



Start:



```bash

docker compose up --build

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

docker compose exec app npx drizzle-kit migrate

```



Check stored records:



```bash

docker compose exec postgres psql -U postgres -d logs -c "SELECT COUNT(\*) FROM logs;"

```



\---



\# 💻 Local Development



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



\---



\# 🧠 Design Decisions



\### PostgreSQL



PostgreSQL provides reliable persistence, indexing, JSONB support, and efficient time-based querying.



\### JSONB



Log attributes are stored as JSONB because different services may produce different metadata.



\### Cursor Pagination



Pagination uses `(timestamp, id)` instead of large offsets, providing deterministic ordering and better scalability.



\### Service Layer



Query construction is separated from Fastify handlers to keep HTTP concerns independent from database logic.



\### Parameterized Queries



All user-controlled values are passed through parameterized database operations to prevent SQL injection.



\---



\# ⚠️ Known Limitations



The following areas require additional optimization or benchmarking:



\* Current measured ingestion throughput is below the 15,000 logs/s baseline.

\* The ingestion API currently accepts one log per HTTP request.

\* A complete 1,000,000-record benchmark under evaluator resource limits has not been completed.

\* Aggregation latency under simultaneous sustained 15,000 logs/s ingestion has not been fully benchmarked.

\* Retention behavior requires additional production-scale testing.

\* Local Docker resource limits differ from the evaluator's constrained environment.



These limitations are explicitly documented rather than presenting unmeasured performance claims.



\---



\# 📌 Summary



The service provides a complete log ingestion and query API with:



\*\*Reliable ingestion\*\* · \*\*PostgreSQL persistence\*\* · \*\*Structured attributes\*\* · \*\*Filtering\*\* · \*\*Search\*\* · \*\*Cursor pagination\*\* · \*\*Validation\*\* · \*\*Docker deployment\*\* · \*\*Automated tests\*\* · \*\*Load testing\*\*



The implementation has been tested with \*\*500k+ stored records\*\* and \*\*100k-request ingestion runs\*\*, with \*\*zero failed requests\*\* observed in the recorded benchmarks.



Further throughput improvements would primarily focus on reducing per-request overhead and batching database writes.



