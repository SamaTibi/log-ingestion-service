# Structured Log Service

A backend service for collecting, storing, searching, and aggregating application logs.

## Stack

* TypeScript
* Fastify
* PostgreSQL
* pg
* Zod
* Docker

## Features

* Batch log ingestion
* Log validation
* Cursor pagination
* Full-text search
* Attribute filtering
* Time aggregation: `1m`, `5m`, `1h`, `1d`
* Daily partitions
* Log retention cleanup
* Health checks

## API

| Method | Endpoint          | Description            |
| ------ | ----------------- | ---------------------- |
| GET    | `/health`         | Health check           |
| POST   | `/logs`           | Insert logs            |
| GET    | `/logs`           | Search and filter logs |
| GET    | `/logs/aggregate` | Aggregate logs         |

## Log Format

```json
{
  "timestamp": "2026-08-14T12:00:00Z",
  "level": "info",
  "service": "api",
  "message": "request completed",
  "attributes": {
    "status": 200
  }
}
```

## Quick Start

```bash
npm install
docker compose up -d --build
```

The API runs on:

```text
http://localhost:8080
```

## Docker

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f
docker compose down
```

## API Examples

### Insert logs

```http
POST /logs
```

```json
{
  "logs": [
    {
      "timestamp": "2026-08-14T12:00:00Z",
      "level": "info",
      "service": "api",
      "message": "request completed",
      "attributes": {
        "status": 200
      }
    }
  ]
}
```

### Query logs

```http
GET /logs?service=api&level=error&limit=50
```

Supported filters:

```text
service
level
since
until
q
attr.*
limit
cursor
```

### Aggregate logs

```http
GET /logs/aggregate?bucket=5m&group_by=service
```

Buckets:

```text
1m
5m
1h
1d
```

### Health

```http
GET /health
```

## Environment Variables

| Variable         | Description           | Default  |
| ---------------- | --------------------- | -------- |
| `DATABASE_URL`   | PostgreSQL connection | Required |
| `PORT`           | Server port           | `8080`   |
| `RETENTION_DAYS` | Log retention period  | `30`     |

## Database

Connect to PostgreSQL:

```bash
docker compose exec postgres psql -U postgres -d logs
```

Useful commands:

```sql
\dt

SELECT COUNT(*) FROM logs;

SELECT * FROM logs LIMIT 10;

\q
```

## Architecture

```text
Client
  ↓
Fastify
  ↓
Zod Validation
  ↓
PostgreSQL
  ├── JSONB attributes
  ├── Daily partitions
  └── Indexes
```

* **Fastify** handles HTTP requests.
* **Zod** validates incoming logs.
* **pg** communicates directly with PostgreSQL.
* **PostgreSQL** handles storage, search, aggregation, and partitions.
* **Docker** runs the application and database.

## Testing

```bash
npm test
```

## Project Structure

```text
log-ingestion-service/
├── src/
│   ├── db/
│   ├── routes/
│   ├── services/
│   ├── types/
│   ├── validation/
│   └── server.ts
├── tests/
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## Author

**Sama Tibi**

Boot.dev TypeScript Final Project — 2026
