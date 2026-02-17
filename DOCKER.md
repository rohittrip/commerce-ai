# Running the Application

This guide covers how to run the Commerce AI application in different environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Local Development](#local-development)
4. [GCP Deployment](#gcp-deployment)
5. [Service Architecture](#service-architecture)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | BFF, Orchestration Service |
| Java | 17+ | Tool Server |
| PostgreSQL | 15+ | Primary database |
| MongoDB | 7+ | Chat/session storage |
| Redis | 7+ | Caching & sessions |

### Optional

| Software | Purpose |
|----------|---------|
| ngrok | External access for mobile testing |
| Docker | Running databases in containers |

---

## Environment Configuration

### Environment Files

| File | Purpose |
|------|---------|
| `.env.local` | Local development with local services |
| `.env.dev` | Development environment (GCP) - uses placeholders |
| `.env.qa` | QA environment (GCP) - uses placeholders |
| `.env.prod` | Production environment (GCP) - uses placeholders |
| `.env.example` | Template with all available variables |

### Setup Local Environment

```bash
# Copy local environment template
cp .env.local .env

# Edit .env and add your API keys
# Required: OPENAI_API_KEY (or ANTHROPIC_API_KEY or GOOGLE_API_KEY)
```

---

## Local Development

### Step 1: Start Database Services

You can run databases locally or use external services.

#### Option A: Local Databases (Recommended)

Ensure these services are running locally:

| Service | Default Port | Connection |
|---------|--------------|------------|
| PostgreSQL | 5433 | `postgresql://postgres:postgres@localhost:5433/commerce_ai` |
| MongoDB | 27017 | `mongodb://localhost:27017/commerce_ai` |
| Redis | 6379 | `redis://localhost:6379` |

#### Option B: External Databases

Update `.env` with your external database URLs:

```env
DATABASE_URL=postgresql://user:pass@your-postgres-host:5432/dbname
MONGODB_URI=mongodb://user:pass@your-mongo-host:27017/dbname
REDIS_URL=redis://:password@your-redis-host:6379
```

### Step 2: Initialize Database Schema

```bash
# Navigate to BFF directory
cd apps/bff-node

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate deploy

# Return to root
cd ../..
```

### Step 3: Start Tool Server (Java)

```bash
# Navigate to tool server
cd services-java/mcp-tool-server

# Build and run
./mvnw spring-boot:run

# Or with Gradle
./gradlew bootRun
```

Wait for: `Started McpToolServerApplication on port 8081`

### Step 4: Start Orchestration Service

```bash
# Open new terminal
cd apps/orchestration-service

# Install dependencies (first time only)
npm install

# Start service
npm run dev
```

Wait for: `Orchestration service running on http://localhost:3001`

### Step 5: Start BFF Service

```bash
# Open new terminal
cd apps/bff-node

# Install dependencies (first time only)
npm install

# Start service
npm run dev
```

Wait for: `🚀 BFF running on http://localhost:3000`

### Step 6: Start Frontend (Optional)

```bash
# Chat UI
cd apps/chat-ui
npm install
npm run dev
# Available at http://localhost:5174

# Admin UI
cd apps/admin-ui
npm install
npm run dev
# Available at http://localhost:5173
```

### Quick Start Script

Run all services at once (requires multiple terminal tabs):

```bash
# Terminal 1: Tool Server
cd services-java/mcp-tool-server && ./mvnw spring-boot:run

# Terminal 2: Orchestration Service
cd apps/orchestration-service && npm run dev

# Terminal 3: BFF
cd apps/bff-node && npm run dev

# Terminal 4: Chat UI (optional)
cd apps/chat-ui && npm run dev
```

---

## Service URLs

### Local Development

| Service | URL |
|---------|-----|
| BFF API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/docs |
| Orchestration | http://localhost:3001 |
| Tool Server | http://localhost:8081 |
| Chat UI | http://localhost:5174 |
| Admin UI | http://localhost:5173 |

### Testing with ngrok

For mobile app testing with external access:

```bash
# Start ngrok tunnel to BFF
ngrok http 3000

# Use the ngrok URL in your mobile app
# Example: https://abc123.ngrok.io
```

---

## GCP Deployment

### Environment Variables

For GCP deployment, use `.env.dev`, `.env.qa`, or `.env.prod` files. These use placeholder variables that should be populated from GCP Secret Manager.

### Required Secrets in GCP Secret Manager

```
# Database
POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
MONGO_HOST, MONGO_PORT, MONGO_DB, MONGO_USER, MONGO_PASSWORD
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD

# Authentication
JWT_SECRET

# LLM API Keys
OPENAI_API_KEY
ANTHROPIC_API_KEY
GOOGLE_API_KEY

# Service URLs
TOOL_SERVER_URL, ORCHESTRATOR_URL, BFF_URL, FRONTEND_URL
```

### Deployment Steps

1. **Create GCP resources** (Cloud SQL, Memorystore, MongoDB Atlas)
2. **Store secrets** in GCP Secret Manager
3. **Deploy services** to Cloud Run or GKE
4. **Configure environment** variables from Secret Manager

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │  Chat UI    │    │  Admin UI   │    │    Mobile App       │ │
│  │  :5174      │    │  :5173      │    │    (External)       │ │
│  └──────┬──────┘    └──────┬──────┘    └──────────┬──────────┘ │
└─────────┼──────────────────┼─────────────────────┼─────────────┘
          │                  │                     │
          └──────────────────┼─────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BFF Layer                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              BFF Service (NestJS)                        │   │
│  │              http://localhost:3000                       │   │
│  │              - REST API                                  │   │
│  │              - Authentication (JWT, OTP)                 │   │
│  │              - Session Management                        │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Orchestration Layer                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         Orchestration Service (NestJS)                   │   │
│  │         http://localhost:3001                            │   │
│  │         - LLM Integration (OpenAI, Anthropic, Google)    │   │
│  │         - Tool Routing                                   │   │
│  │         - Context Management                             │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Tool Layer                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Tool Server (Spring Boot)                     │   │
│  │            http://localhost:8081                         │   │
│  │            - Product Search                              │   │
│  │            - Cart Operations                             │   │
│  │            - Provider Integration                        │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │   MongoDB    │  │    Redis     │          │
│  │   :5433      │  │   :27017     │  │    :6379     │          │
│  │  - Users     │  │  - Chat      │  │  - Sessions  │          │
│  │  - Products  │  │  - Messages  │  │  - Cache     │          │
│  │  - Orders    │  │  - History   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Database Connection Failed

1. Verify database service is running
2. Check connection string in `.env`
3. Ensure correct port is configured

```bash
# Test PostgreSQL connection
psql -h localhost -p 5433 -U postgres -d commerce_ai

# Test MongoDB connection
mongosh mongodb://localhost:27017/commerce_ai

# Test Redis connection
redis-cli -h localhost -p 6379 ping
```

#### Prisma Migration Issues

```bash
cd apps/bff-node

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Generate client
npx prisma generate

# Apply migrations
npx prisma migrate deploy
```

#### OpenAI API Key Error

Check that `OPENAI_API_KEY` is set correctly in `.env`:

```bash
grep OPENAI_API_KEY .env
```

The key should start with `sk-` or `sk-proj-`.

---

## Health Checks

### Verify All Services

```bash
# BFF Health
curl http://localhost:3000/health

# Orchestration Health
curl http://localhost:3001/health

# Tool Server Health
curl http://localhost:8081/actuator/health
```

### API Quick Test

```bash
# Create chat session
curl -X POST http://localhost:3000/v1/chat/sessions \
  -H "Content-Type: application/json" \
  -d '{}'

# Send message (replace SESSION_ID)
curl -X POST http://localhost:3000/v1/chat/messages \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "SESSION_ID", "message": "Hello"}'
```
