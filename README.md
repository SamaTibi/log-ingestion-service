# Log Ingestion Service

A simple backend service for **storing, querying, and filtering application logs**.

Built with **TypeScript, Fastify, PostgreSQL, Drizzle ORM, and Vitest**.

---

## 🚀 Features

* 📥 Ingest logs using `POST /logs`
* 🔎 Query logs using `GET /logs`
* 🎯 Filter logs by:

  * Service
  * Log level
  * Time range
  * Message content
  * Attributes
* 📄 Pagination using `limit` and cursor
* ✅ Validation for invalid log data
* 🗑️ Configurable log retention
* 🧪 Automated tests with Vitest
* 🗄️ PostgreSQL database with Drizzle ORM

---

## 🛠️ Tech Stack

| Technology      | Purpose                               |
| --------------- | ------------------------------------- |
| **TypeScript**  | Application development               |
| **Fastify**     | HTTP server and API                   |
| **PostgreSQL**  | Database                              |
| **Drizzle ORM** | Database access and schema management |
| **Vitest**      | Testing                               |

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
│
├── tests/
│   ├── database.test.ts
│   ├── health.test.ts
│   └── logs.test.ts
│
├── .env
├── drizzle.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/SamaTibi/log-ingestion-service.git
cd log-ingestion-service
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/logs
PORT=8080
RETENTION_DAYS=30
AUTH_ENABLED=false
```

### 4. Setup the database

Run the database migration/schema command:

```bash
npm run db:push
```

### 5. Start the development server

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:8080
```

---

## 📡 API

### Add Logs

**POST `/logs`**

Request:

```json
{
  "logs": [
    {
      "timestamp": "2026-08-14T13:00:00Z",
      "level": "info",
      "service": "checkout",
      "message": "Order created",
      "attributes": {
        "user_id": 42
      }
    }
  ]
}
```

The endpoint validates each log and processes valid and invalid entries independently.

---

### Get Logs

**GET `/logs`**

Retrieve stored logs with optional filters.

#### Filter by service

```http
GET /logs?service=checkout
```

#### Filter by level

```http
GET /logs?level=error
```

#### Search by message

```http
GET /logs?q=declined
```

#### Limit results

```http
GET /logs?limit=10
```

#### Combine filters

```http
GET /logs?service=checkout&level=error
```

---

## 🔍 Supported Filters

| Parameter    | Description                                   |
| ------------ | --------------------------------------------- |
| `service`    | Filter logs by service name                   |
| `level`      | Filter by `debug`, `info`, `warn`, or `error` |
| `since`      | Return logs after a specific timestamp        |
| `until`      | Return logs before a specific timestamp       |
| `q`          | Search log messages                           |
| `attributes` | Filter using log attributes                   |
| `limit`      | Number of logs to return                      |
| `cursor`     | Cursor for pagination                         |

---

## 🧪 Testing

Run the complete test suite:

```bash
npm test
```

### Test Results

```text
Test Files  3 passed (3)
Tests       38 passed (38)
```

The test suite covers:

* Database functionality
* Health endpoint
* Log ingestion
* Validation
* Batch processing
* Log querying
* Filtering
* Pagination

---

## 🏗️ Build

Create the production build with:

```bash
npm run build
```

Start the compiled application with:

```bash
npm start
```

---

## 📌 API Overview

| Method | Endpoint | Description             |
| ------ | -------- | ----------------------- |
| `POST` | `/logs`  | Ingest application logs |
| `GET`  | `/logs`  | Query and filter logs   |

---

## 🔐 Configuration

The service supports environment-based configuration:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/logs
PORT=8080
RETENTION_DAYS=30
AUTH_ENABLED=false
```

| Variable         | Description                   | Example            |
| ---------------- | ----------------------------- | ------------------ |
| `DATABASE_URL`   | PostgreSQL connection string  | `postgresql://...` |
| `PORT`           | Server port                   | `8080`             |
| `RETENTION_DAYS` | Log retention period          | `30`               |
| `AUTH_ENABLED`   | Enable/disable authentication | `false`            |

---

## 👩‍💻 Author

**Sama Tibi**
