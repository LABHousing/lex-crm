#!/bin/sh
set -eu

DEFAULT_STORAGE_DIR="/app/data"

if [ ! -w "/app" ]; then
  DEFAULT_STORAGE_DIR="./data"
fi

PERSISTED_DIR="${DATABASE_STORAGE_DIR:-$DEFAULT_STORAGE_DIR}"
PERSISTED_DB_PATH="${DATABASE_FILE_PATH:-$PERSISTED_DIR/dev.db}"
BUNDLED_DB_PATH="${BUNDLED_DB_PATH:-/app/dev.db}"

mkdir -p "$PERSISTED_DIR"

if [ ! -f "$PERSISTED_DB_PATH" ] && [ -f "$BUNDLED_DB_PATH" ]; then
  cp "$BUNDLED_DB_PATH" "$PERSISTED_DB_PATH"
fi

export DATABASE_URL="${DATABASE_URL:-file:$PERSISTED_DB_PATH}"

export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"

# Ensure required tables exist in fresh/persisted SQLite before app boot.
npx prisma db push --accept-data-loss

exec npx next start -H "$HOSTNAME" -p "$PORT"
