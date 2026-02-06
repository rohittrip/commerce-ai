# Running the app with Docker

## Prerequisites

- Docker Desktop (or Docker Engine + Compose) installed and running.
- If you see `error getting credentials` on macOS: open Docker Desktop, sign in (or remove invalid credentials in Keychain Access for “Docker”), then try again.

## Start everything

From the repo root (`commerce-ai/`):

```bash
docker compose up --build -d
```

This will:

1. **postgres** – Postgres 15 on port 5432, DB `commerce_ai`, init from `infra/docker/init.sql`
2. **redis** – Redis 7 on port 6379
3. **mongo** – MongoDB 7 on port 27017 (for BFF mobile flow)
4. **tool-server** – Java MCP tool server on 8081 (depends on postgres)
5. **bff** – Node BFF on port 3000 (depends on postgres, redis, mongo, tool-server)
6. **admin-ui** – Nginx-served admin UI on port 3001 (depends on bff)

## URLs

| Service   | URL                        |
|----------|----------------------------|
| BFF API  | http://localhost:3000      |
| Swagger  | http://localhost:3000/docs |
| Admin UI | http://localhost:3001      |
| Tool API | http://localhost:8081      |

## Optional env vars

Create a `.env` in the repo root if you want to override defaults:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=commerce_ai
POSTGRES_PORT=5432
REDIS_PORT=6379
MONGO_PORT=27017
JWT_SECRET=your-secret
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
GOOGLE_API_KEY=...
```

## Logs and stop

```bash
# Logs (all services)
docker compose logs -f

# Logs for one service
docker compose logs -f bff

# Stop
docker compose down
```

## If BFF fails to start

- Ensure **postgres**, **redis**, **mongo**, and **tool-server** are healthy: `docker compose ps`
- BFF needs all four; it waits for their healthchecks before starting.
- First run can take a few minutes while images build and DBs initialize.
