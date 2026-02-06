# Conversational Commerce Assistant — Full Project Spec (Cursor Instruction Set)

> Objective: Build a multi-provider conversational shopping assistant (mobile-first) that can search/compare products, add to cart, and create/track orders via **internal MCP tools**, while optionally exposing **UCP** endpoints for external ecosystems.  
> Approach: **App-facing REST/SSE** (Node BFF) + **Internal MCP Tool Server** (Java Spring Boot, provider integration + normalization).

---

## 0) Non-Negotiables

1. **Mobile never calls MCP directly.** Mobile calls **BFF REST + SSE** only.
2. **One orchestrator brain** (in Node BFF). Only BFF interacts with LLMs.
3. **All commerce tools are internal** (Java MCP Tool Server). LLM can suggest actions, but **state changes happen only via tool APIs**.
4. **Canonical contracts are owned by us** (stable schemas). Provider payloads never leak outside integration layer.
5. **Schema validation at boundaries**: validate MCP tool inputs/outputs; validate BFF responses.
6. **Observability everywhere**: traceId propagated BFF → tool server → provider clients.
7. **Safety**: tool allowlist; rate limits; PII redaction in logs; idempotency keys for cart/order mutations.

---

## 1) Target Tech Stack

### App & Edge

- Mobile: React Native.
- BFF**Node.js: (TypeScript, NestJS)**
- Orchestrator**Node.js: (TypeScript, NestJS)**
- Streaming: **SSE** for `/v1/chat/messages` (WebSocket)

### Tool/Integration & Core Services

- Java 17 + Spring Boot 3.x
- MCP Tool Server: Java
- Provider clients: generated from provider OpenAPI (if available)

### Data/Infra

- Postgres (OLTP)
- Redis (cache/session/rate-limit)
- Pub/Sub (optional; for webhook events processing like order update etc).
- GKE / Kubernetes (deployment manifests required)

### Observability/Security

- JWT for user auth (BFF)
- Service-to-service auth: signed JWT/mTLS (internal) TBD(Murli suggest existing apis required cookies in api header so we have to generate it and store in db and regenerate on expiry).
- Secrets in Secret Manager / K8s secrets

---

## 2) System Architecture Overview

### Components

- **Mobile App** → **BFF (Node)** → **AI Orchestrator** (inside BFF)
- Orchestrator calls:
  - **Conversation Store** (Postgres) for sessions/messages/tool-calls/feedback
  - **Java MCP Tool Server** for commerce actions (search/compare/cart/order)
- Java MCP Tool Server calls:
  - provider APIs (catalog/search/pricing/inventory/cart/order) via adapters
  - optional internal cache (Redis)
  - optional persistence for order/cart snapshots (Postgres)

---

## 3) Network Architecture Diagram (Mermaid)

```mermaid
flowchart TB
  Internet((Internet)) --> WAF[WAF / Cloud Armor]
  WAF --> LB[HTTPS Load Balancer]
  LB --> Ingress[K8s Ingress]

  subgraph K8S["Kubernetes / GKE Cluster"]
    BFF[Node BFF + Orchestrator]
    TOOL[Java MCP Tool Server\n(UCP + Provider Proxy)]
    REDIS[(Redis)]
  end

  subgraph DATA["Managed Data Services"]
    PG[(Postgres)]
    OS[(OpenSearch - optional)]
    BUS[(Pub/Sub/Kafka - optional)]
  end

  subgraph PROVIDERS["External Providers"]
    P1[Provider A\n(Catalog/Search/Pricing/Inventory/Cart/Order)]
    P2[Provider B\n(...)]
  end

  Ingress --> BFF
  BFF --> PG
  BFF --> REDIS
  BFF --> TOOL

  TOOL --> REDIS
  TOOL --> PG
  TOOL --> OS
  TOOL --> BUS
  TOOL --> P1
  TOOL --> P2
```

Cursor Build Instructions (Exact Implementation Steps)
Step A — Generate Node BFF (NestJS)

Create modules: auth, chat, products, cart, orders, telemetry.

Add SSE endpoint:

POST /v1/chat/messages returns text/event-stream

stream events: token, cards, followups, done, error

Implement Orchestrator:

multi-LLM provider interface

prompt templates

guardrails checks

calls Java MCP tools via mcp.client.ts

Persist sessions/messages/tool_calls/feedback in Postgres.

Add Redis for rate limits + caching (optional in MVP).

Step B — Generate Java MCP Tool Server (Spring Boot)

Implement Tool Registry:

Each tool has: name, description, inputSchemaPath, outputSchemaPath, handler

Validate input/output against JSON Schema.

Implement provider adapter interface and MockProvider.

Implement tools:

searchProducts (multi-provider merge + dedupe)

compareProducts

cart.add/update/remove/get (with idempotency)

order.create/getStatus (with idempotency)

Add resilience:

timeouts + retries + circuit breakers for provider calls

Observability:

traceId in all logs + responses

propagate trace headers from BFF

Step C — OpenAPI & Schemas

OpenAPI for BFF endpoints is optional for MVP. If needed later, add `docs/api/bff-openapi.yaml`.

Generate JSON Schemas under docs/api/mcp-tool-schemas/v1/.

Add contract tests:

provider fixtures → expected canonical output.

Step D — Infra

docker-compose.dev.yml:

Postgres, Redis, BFF, Tool Server

K8s manifests:

Deployments, Services, Ingress, ConfigMaps, Secrets

11. Acceptance Criteria (MVP)

Chat:

User sends query → gets streamed response + product cards within acceptable latency.

Search tool:

commerce.searchProducts returns canonical ProductSummary list with price + stock.

Cart:

Add item via chat action works (idempotent) and returns updated cart totals.

Order:

Create order returns orderId + status + paymentUrl (or deeplink) reliably.

Safety:

Tool allowlist enforced; schema validation passes; PII not logged.

Observability:

traceId visible end-to-end in both services.

12) Notes on Provider-Only APIs (No internal catalog/search services)

We will NOT create separate catalog/search/cart/order microservices unless needed.
Instead:

Java MCP Tool Server integrates provider APIs directly via adapters.

We store minimal canonical snapshots + audit in Postgres for traceability and UX continuity.

If/when you need caching/indexing (OpenSearch), add it inside Tool Server as optional optimization.
