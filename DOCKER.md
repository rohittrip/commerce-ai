# Docker Deployment Guide

This document describes how to build and run the Commerce AI services using Docker.

## Prerequisites

- Docker Desktop (or Docker Engine) installed and running
- Access to container registry (for pushing images)

## Services and Dockerfiles

| Service | Dockerfile Location | Port |
|---------|---------------------|------|
| BFF | `apps/bff-node/Dockerfile` | 3000 |
| Orchestration | `apps/orchestration-service/Dockerfile` | 3001 |
| Tool Server | `services-java/mcp-tool-server/Dockerfile` | 8081 |
| Admin UI | `apps/admin-ui/Dockerfile` | 80 |
| Chat UI | `apps/chat-ui/Dockerfile` | 80 |

## Building Docker Images

### BFF Service

```bash
docker build -t commerce-ai-bff:latest -f apps/bff-node/Dockerfile .
```

### Orchestration Service

```bash
docker build -t commerce-ai-orchestration:latest -f apps/orchestration-service/Dockerfile .
```

### Tool Server (Java)

```bash
docker build -t commerce-ai-tool-server:latest -f services-java/mcp-tool-server/Dockerfile ./services-java
```

### Admin UI

```bash
docker build -t commerce-ai-admin-ui:latest -f apps/admin-ui/Dockerfile ./apps/admin-ui
```

### Chat UI

```bash
docker build -t commerce-ai-chat-ui:latest -f apps/chat-ui/Dockerfile ./apps/chat-ui
```

## Running Containers

Each service requires environment variables. Use the appropriate `.env` file for your environment:

- `.env.dev` - Development (GCP)
- `.env.qa` - QA (GCP)
- `.env.prod` - Production (GCP)

### Example: Running BFF

```bash
docker run -d \
  --name bff \
  -p 3000:3000 \
  --env-file .env.dev \
  commerce-ai-bff:latest
```

### Example: Running Orchestration Service

```bash
docker run -d \
  --name orchestration \
  -p 3001:3001 \
  --env-file .env.dev \
  commerce-ai-orchestration:latest
```

### Example: Running Tool Server

```bash
docker run -d \
  --name tool-server \
  -p 8081:8081 \
  --env-file .env.dev \
  commerce-ai-tool-server:latest
```

## Environment Variables

All services require external database connections. Configure these in your environment file:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `MONGODB_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret |
| `OPENAI_API_KEY` | OpenAI API key |

See `.env.example` for the complete list of environment variables.

## Container Registry

To push images to a container registry:

```bash
# Tag for registry
docker tag commerce-ai-bff:latest <registry>/commerce-ai-bff:latest

# Push to registry
docker push <registry>/commerce-ai-bff:latest
```

## Health Checks

Each service exposes health endpoints:

| Service | Health Endpoint |
|---------|-----------------|
| BFF | `GET /health` |
| Orchestration | `GET /health` |
| Tool Server | `GET /actuator/health` |
