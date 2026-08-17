Here's the updated README with the Docker commands and database section added:

---

# Log Ingestion Service

A simple backend service for **storing, querying, and filtering application logs**.

Built with **TypeScript, Fastify, PostgreSQL, Drizzle ORM, Docker, Docker Compose, and Vitest**.

---

## 🚀 Features

- 📥 Ingest logs using `POST /logs`
- 🔎 Query logs using `GET /logs`
- 🎯 Filter logs by service, level, time range, message, and attributes
- 📄 Cursor-based pagination
- 📦 Batch log ingestion
- ✅ Validation for invalid log data
- 🗑️ Configurable log retention
- 🩺 Health check endpoint
- 🧪 Automated tests with Vitest
- 🐳 Docker and Docker Compose support

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| TypeScript | Application development |
| Fastify | HTTP server and API |
| PostgreSQL | Database |
| Drizzle ORM | Database access and schema management |
| Vitest | Automated testing |
| Docker | Application containerization |
| Docker Compose | Application and database orchestration |

---

## 📁 Project Structure

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
│   ├── database.test.ts
│   ├── health.test.ts
│   └── logs.test.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

---

## 🐳 Running with Docker Compose

1. Clone the repository

```bash
git clone https://github.com/SamaTibi/log-ingestion-service.git
cd log-ingestion-service
```

2. Create the environment file

```bash
cp .env.example .env
```

Configure the `.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/logs
PORT=8080
RETENTION_DAYS=30
AUTH_ENABLED=false
```

3. Build and start the services

```bash
docker compose up --build
```

The API will be available at: `http://localhost:8080`

4. Run in detached mode

```bash
docker compose up -d --build
```

---

## 🐳 Docker Commands

### Build
```bash
docker compose build                 # Build the application image
docker compose build --no-cache app  # Build without cache
```

### Start
```bash
docker compose up -d                 # Start services in background
docker compose up -d --build         # Rebuild and start
```

### Monitor
```bash
docker compose ps                    # Check running containers
docker compose logs app              # View application logs
docker compose logs -f app           # Follow application logs
```

### Stop
```bash
docker compose down                  # Stop services
docker compose down -v               # Stop services and remove database data
```

---

## 🗄️ Database

PostgreSQL is automatically started by Docker Compose.

To connect to the PostgreSQL database:

```bash
docker compose exec postgres psql -U postgres -d logs
```

Example queries:

```sql
-- Count total logs
SELECT count(*) FROM logs;

-- View recent logs
SELECT * FROM logs ORDER BY created_at DESC LIMIT 5;

-- Filter by service
SELECT * FROM logs WHERE service = 'checkout';

-- Count logs by level
SELECT level, count(*) FROM logs GROUP BY level;
```

---

## 🩺 Health Check

```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok"
}
```

---

## 📡 API

### Add Logs
**POST** `/logs`

```json
{
  "logs": [
    {
      "timestamp": "2026-08-14T13:00:00Z",
      "level": "info",
      "service": "checkout",
      "message": "Order created",
      "attributes": { "user_id": 42 }
    }
  ]
}
```

### Get Logs
**GET** `/logs`

```bash
GET /logs?service=checkout
GET /logs?level=error
GET /logs?q=declined
GET /logs?since=2026-08-14T13:00:00Z
GET /logs?until=2026-08-14T15:00:00Z
GET /logs?limit=10
GET /logs?service=checkout&level=error
```

### Supported Filters

| Parameter | Description |
|-----------|-------------|
| `service` | Filter by service name |
| `level` | Filter by log level |
| `since` | Logs after timestamp |
| `until` | Logs before timestamp |
| `q` | Search in message |
| `attr.*` | Filter by attributes |
| `limit` | Number of results (max 100) |
| `cursor` | Pagination cursor |

---

## 🧪 Testing

```bash
npm test
```

Results:
```
Test Files  3 passed (3)
Tests       38 passed (38)
```

---

## 🔧 Local Development (Without Docker)

1. Install dependencies
```bash
npm install
```

2. Configure `.env`
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/logs
PORT=8080
RETENTION_DAYS=30
AUTH_ENABLED=false
```

3. Start the development server
```bash
npm run dev
```

---

## ⚙️ Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `PORT` | Server port | `8080` |
| `RETENTION_DAYS` | Log retention period | `30` |
| `AUTH_ENABLED` | Enable authentication | `false` |

---

## 👩‍💻 Author

**Sama Tibi**