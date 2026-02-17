# Commerce AI – Build Guide

This document describes how to build the Commerce AI project locally and run it.

## Prerequisites

- **Node.js** v18 or later
- **npm** (comes with Node)
- **PostgreSQL** (for BFF and Tool Server)
- **Redis** (optional; used by BFF for caching/sessions)
- **Java 17** (for MCP Tool Server only)
- **Maven** (for MCP Tool Server only)

## 1. Clone and prepare environment

```bash
cd commerce-ai
```

Copy environment template and set variables (see [INSTALL.md](INSTALL.md) for full list):

```bash
cp .env.example .env
# Edit .env and set at least: DATABASE_URL, JWT_SECRET, and one LLM API key.
```

## 2. Install dependencies

There is no single root `package.json`. Install each app separately.

### Node/TypeScript apps

```bash
# BFF (NestJS)
cd apps/bff-node && npm install && cd ../..

# Orchestration service
cd apps/orchestration-service && npm install && cd ../..

# Admin UI (React + Vite)
cd apps/admin-ui && npm install && cd ../..

# Chat UI (React + Vite)
cd apps/chat-ui && npm install && cd ../..
```

Or in one go (from repo root):

```bash
for app in apps/bff-node apps/orchestration-service apps/admin-ui apps/chat-ui; do
  (cd "$app" && npm install)
done
```

### Java (MCP Tool Server)

From repo root:

```bash
cd services-java && mvn install -DskipTests && cd ..
```

Or from `services-java`:

```bash
cd services-java
mvn install -DskipTests
```

This builds the parent POM, `shared-lib`, and `mcp-tool-server`.

## 3. Build (compile) the project

### BFF (TypeScript → JavaScript)

```bash
cd apps/bff-node
npm run build
cd ../..
```

Output: `apps/bff-node/dist/`.

### Orchestration service (TypeScript → JavaScript)

```bash
cd apps/orchestration-service
npm run build
cd ../..
```

Output: `apps/orchestration-service/dist/`.

### Admin UI (TypeScript + Vite → static assets)

```bash
cd apps/admin-ui
npm run build
cd ../..
```

Output: `apps/admin-ui/dist/` (production bundle).

### Chat UI (TypeScript + Vite → static assets)

```bash
cd apps/chat-ui
npm run build
cd ../..
```

Output: `apps/chat-ui/dist/`.

### Java (MCP Tool Server)

Already built in step 2 with `mvn install`. To rebuild only:

```bash
cd services-java
mvn package -DskipTests
```

Runnable JAR: `services-java/mcp-tool-server/target/mcp-tool-server-*.jar`.

## 4. One-command build (all apps)

From repo root, run each build in sequence:

```bash
# Node apps
(cd apps/bff-node && npm run build) && \
(cd apps/orchestration-service && npm run build) && \
(cd apps/admin-ui && npm run build) && \
(cd apps/chat-ui && npm run build)

# Java (if you have Maven)
(cd services-java && mvn install -DskipTests)
```

Ensure dependencies are installed first (`npm install` in each app, and `mvn install` for Java).

## 5. Database and migrations (BFF)

Before running the BFF, set up the database and run Prisma:

```bash
cd apps/bff-node
npx prisma generate
npx prisma migrate deploy   # or: npx prisma migrate dev
cd ../..
```

Use the same `DATABASE_URL` (or `NODE_DATABASE_URL`) as in your `.env`.

## 6. Run the project

### Option A: Docker

Build and run individual services using Docker. See [DOCKER.md](DOCKER.md) for detailed instructions.

```bash
# Build images
docker build -t commerce-ai-bff:latest -f apps/bff-node/Dockerfile .
docker build -t commerce-ai-orchestration:latest -f apps/orchestration-service/Dockerfile .
docker build -t commerce-ai-tool-server:latest -f services-java/mcp-tool-server/Dockerfile ./services-java
```

### Option B: Run services manually

Start in separate terminals (ensure external DB services are configured):

1. **MCP Tool Server** (port 8081):  
   `cd services-java/mcp-tool-server && ./mvnw spring-boot:run`  
   or: `java -jar target/mcp-tool-server-*.jar`

2. **BFF** (port 3000):  
   `cd apps/bff-node && npm run dev`  
   or: `npm start` (uses `dist/main.js` after build)

3. **Orchestration service** (port 3001):  
   `cd apps/orchestration-service && npm run dev`  
   or: `npm start`

4. **Admin UI** (e.g. port 5173):  
   `cd apps/admin-ui && npm run dev`

5. **Chat UI** (e.g. port 5174):  
   `cd apps/chat-ui && npm run dev`

You can also use the helper script (builds TS apps then starts):

```bash
./scripts/manage-apps.sh start all
```

## 7. Verify build

- **BFF**: `curl -s http://localhost:3000/api` (or the base URL you use).
- **Tool Server**: `curl -s http://localhost:8081/api/v1/tools/health`.
- **Admin UI**: Open `http://localhost:3001` (Docker) or `http://localhost:5173` (Vite dev).
- **Chat UI**: Open `http://localhost:5174` (Vite dev).

## Troubleshooting

- **ENOSPC / no space left**: Free disk space; build and `node_modules` need room.
- **TS errors in admin-ui**: Run `npm run build` in `apps/admin-ui`; fix any reported TypeScript errors.
- **Prisma / DB connection**: Ensure PostgreSQL is running and `DATABASE_URL` in `.env` is correct.
- **Java/Maven**: Use Java 17 and run `mvn install -DskipTests` from `services-java` (needs network for dependencies).

For more detail on env vars, DB setup, and services, see [INSTALL.md](INSTALL.md).
