# gRPC between BFF and Orchestrator

When you separate the BFF and Orchestrator into different services, you can use **gRPC** instead of HTTP for BFF ↔ Orchestrator calls. This is already wired in the codebase.

## Overview

- **Proto definitions**: `proto/orchestrator.proto` (and `proto/bff.proto` for future Orchestrator → BFF calls).
- **Orchestration service**: Exposes a gRPC server (default `0.0.0.0:50051`) in addition to HTTP (port 3001).
- **BFF**: Uses HTTP by default. Set `ORCHESTRATOR_GRPC_URL` to switch to the gRPC client for all orchestrator calls.

## RPCs

| RPC | Direction | Description |
|-----|-----------|-------------|
| `ProcessMessage` | BFF → Orchestrator | Server stream: process user message, stream JSON chunks (same shape as current SSE). |
| `TestTool` | BFF → Orchestrator | Unary: execute a tool (e.g. admin test-tool). |

## Configuration

### BFF

- **HTTP (default)**  
  - Uses `ORCHESTRATOR_URL` (e.g. `http://localhost:3001`) for chat and admin test-tool.

- **gRPC**  
  - Set `ORCHESTRATOR_GRPC_URL` to the orchestrator gRPC address, e.g. `localhost:50051` or `orchestration:50051` in Docker.  
  - BFF then uses gRPC for `processMessage` (chat) and `testTool` (admin).

### Orchestration service

- gRPC server starts automatically and binds to `ORCHESTRATOR_GRPC_URL` or `0.0.0.0:50051`.
- Proto path: `apps/orchestration-service/proto/orchestrator.proto` (copied from repo root `proto/`).

## Future: Orchestrator → BFF

`proto/bff.proto` defines a minimal `Bff` service (e.g. `Health`) for when the Orchestrator needs to call back into the BFF (e.g. get cart, persist chat message). To use it:

1. Add a gRPC server in the BFF that implements `Bff`.
2. In the Orchestration service, add a gRPC client for `Bff` and call it when needed.

## Proto location

- **Single source of truth**: `proto/` at repo root.
- **Orchestration service**: `apps/orchestration-service/proto/orchestrator.proto` (copy for self-contained build).
- **BFF**: `apps/bff-node/proto/orchestrator.proto` (copy for self-contained build).

When splitting into separate repos, copy the relevant proto(s) into each repo or publish a shared proto package.
