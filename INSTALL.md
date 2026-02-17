# Commerce AI - Installation Guide

## Prerequisites
- Node.js (v18+)
- PostgreSQL
- Redis
- Java 17 (for MCP Tool Server)

## Setup

1. **Clone and Install Dependencies**
   ```bash
   git clone <repo-url>
   cd commerce-ai
   npm install
   ```

2. **Environment Variables**

   Create a `.env` file in the root directory with the following variables:

   ```bash
   # Database
   NODE_DATABASE_URL=postgresql://postgres:password@localhost:5432/commerce_ai

   # LLM API Keys
   OPENAI_API_KEY=your-openai-api-key
   GEMINI_API_KEY=your-gemini-api-key
   ANTHROPIC_API_KEY=your-anthropic-api-key

   # JWT Authentication
   JWT_SECRET=your-secure-jwt-secret-min-32-chars

   # Redis
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

   **MCP Tool Server (Java):**

   Create `services-java/mcp-tool-server/src/main/resources/application.yml` or use environment variables:

   ```yaml
   # Security Configuration
   security:
     enabled: true

   jwt:
     secret: ${JWT_SECRET:your-secure-jwt-secret-min-32-chars}

   # CORS Configuration
   cors:
     allowed-origins: http://localhost:3001,http://localhost:3000

   # Rate Limiting
   ratelimit:
     enabled: true
     requests-per-minute-per-user: 100
     requests-per-minute-per-ip: 200

   # Provider Credentials (Required if provider is enabled)
   provider:
     rd:
       enabled: false
       auth:
         token: ${PROVIDER_RD_AUTH_TOKEN}
   ```

   **Environment Variables for Production:**

   ```bash
   # Security
   SECURITY_ENABLED=true
   JWT_SECRET=<your-production-jwt-secret>
   ALLOWED_ORIGINS=https://yourapp.com,https://api.yourapp.com

   # Rate Limiting
   RATELIMIT_ENABLED=true
   RATELIMIT_REQUESTS_PER_MINUTE_PER_USER=100
   RATELIMIT_REQUESTS_PER_MINUTE_PER_IP=200

   # Provider Credentials
   PROVIDER_RD_ENABLED=true
   PROVIDER_RD_AUTH_TOKEN=<reliance-digital-token>
   ```

3. **Database Setup**
   Run the SQL scripts in `infra/db/` to initialize PostgreSQL.

4. **Start Services**

   Ensure PostgreSQL, Redis, and MongoDB are configured (external services or local).
   
   **Run each service in a separate terminal:**
   ```bash
   # 1. Orchestration Service (Port 3001)
   cd apps/orchestration-service && npm run dev

   # 2. BFF Node (Port 3000)
   cd apps/bff-node && npm run dev

   # 3. Chat UI (Port 3002)
   cd apps/chat-ui && npm run dev

   # 4. Admin UI (Port 3003)
   cd apps/admin-ui && npm run dev

   # 5. MCP Tool Server (Java)
   cd services-java/mcp-tool-server && ./mvnw spring-boot:run
   ```

## Quick Start
Once all services are running, open `http://localhost:3002` for the Chat UI and `http://localhost:3003` for the Admin Dashboard.
