#!/bin/bash
# Build Node/TS apps only: bff-node, orchestration-service, admin-ui, chat-ui.
# Run from repo root. Install deps first: npm install in each app.
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Building Node/TS apps..."
for app in apps/bff-node apps/orchestration-service apps/admin-ui apps/chat-ui; do
  echo "  -> $app"
  (cd "$app" && npm run build)
done

# Java (services-java) skipped by default. To build: cd services-java && mvn install -DskipTests

echo "Build complete (bff-node, orchestration-service, admin-ui, chat-ui)."
