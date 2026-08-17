#!/bin/sh

set -e

echo "========================================"
echo "Starting Log Ingestion Service"
echo "========================================"

echo "Running database migrations..."

npm run migrate

echo "Database migrations completed."

echo "Starting application..."

exec node dist/server.js