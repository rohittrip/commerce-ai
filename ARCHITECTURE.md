# Commerce AI - Architecture & Technical Guide

## System Overview
Multi-service AI-powered shopping platform with modular architecture and SOLID principles.

### Core Services
- **Chat UI** (Port 3002): Consumer shopping interface
- **Admin UI** (Port 3003): Provider & tool configuration dashboard
- **BFF Node** (Port 3000): API gateway, auth, session management
- **Orchestration Service** (Port 3001): AI brain - intent detection, LLM routing, tool execution
- **MCP Tool Server** (Java): Tool execution with provider adapters

## Tool & Provider Architecture

### Tool-Level Management
- **Granular Control**: Enable/disable tools per provider (e.g., Ajio.search ✓, Ajio.cart ✗)
- **OpenAPI Schema**: Upload `openapi.yml` → auto-populates tool configs, paths, methods
- **Field Mapping**: Canonical fields (fixed) → Provider fields (dynamic per tool)
  ```
  Internal: product.name → Ajio: title
  Internal: product.name → RD.in: productName
  ```
- **Category Mapping**: Hierarchical category translation per tool

### Data Flow
```
Admin Upload OpenAPI → Parse Tools → Store tool_configs (DB)
→ Tool Request → Validate Tool Enabled → Apply Mappings → Execute Provider API
```

### Database Schema
```sql
providers table:
  - tool_configs: JSONB {toolName: {enabled, path, method, mappings}}
  - openapi_spec: JSONB (full schema)
```

### SOLID Implementation (Java)
- **FieldMapper**: Interface for mapping operations
- **ProviderFieldMapper**: Concrete mapper per provider
- **ToolValidator**: Validates tool enablement & requests
- **ValidationException**: Custom error handling

## Directory Structure

```text
commerce-ai/
├── apps/
│   ├── admin-ui/             # React Admin Dashboard
│   ├── chat-ui/              # React Chat Interface
│   ├── bff-node/             # Backend for Frontend (NestJS)
│   └── orchestration-service/ # AI Orchestrator (NestJS)
├── services-java/
│   └── mcp-tool-server/      # Java Spring Boot MCP Server
├── infra/
│   └── db/                   # Database schemas and migrations
└── docs/                     # Additional technical documentation
```

## Service Communication
1. **Admin UI → BFF**: Upload OpenAPI, manage tool configs
2. **BFF → DB**: Store/retrieve provider & tool configurations
3. **Chat → BFF → Orchestrator**: AI message processing (SSE)
4. **Orchestrator → MCP**: Tool execution with provider selection
5. **MCP → Provider APIs**: Apply mappings, execute external calls
6. **Orchestrator → LLM**: OpenAI/Gemini/Claude integration

## Admin Features
- **Provider List**: View all configured providers (Ajio, RD.in, Tira, Jio Mart)
- **Tool Management Tab**: 
  - Toggle enable/disable per tool
  - Edit HTTP method & path
  - Field & category mappings
  - Upload/download OpenAPI schemas
- **Real-time Updates**: Changes apply immediately to tool execution

## API Documentation
Generate via Swagger/OpenAPI after testing completion.
