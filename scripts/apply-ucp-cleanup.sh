#!/bin/bash

# UCP Cleanup Migration Script
# This script applies all the fixes for UCP compliance:
# 1. Updates tool categories from subcategories to main categories
# 2. Removes old order tools
# 3. Updates provider tool configs
# 4. Changes provider capabilities from ORDER to CHECKOUT

set -e

echo "🔧 Starting UCP Cleanup Migration..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f "apps/bff-node/.env" ]; then
    echo -e "${RED}Error: .env file not found in apps/bff-node/${NC}"
    exit 1
fi

# Load database URL from .env
source apps/bff-node/.env

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL not set in .env${NC}"
    exit 1
fi

echo -e "${YELLOW}Database: $DATABASE_URL${NC}"

# Run the migration SQL script
echo -e "\n${GREEN}Step 1: Applying database migrations...${NC}"
psql "$DATABASE_URL" -f infra/docker/migrations/004_fix_tool_categories.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database migration completed successfully${NC}"
else
    echo -e "${RED}✗ Database migration failed${NC}"
    exit 1
fi

# Sync new UCP tools via API
echo -e "\n${GREEN}Step 2: Syncing new UCP tools via API...${NC}"
curl -X POST http://localhost:3000/v1/admin/sync-tools \
  -H "Content-Type: application/json" \
  -s | jq .

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tool sync completed successfully${NC}"
else
    echo -e "${YELLOW}⚠ Tool sync failed. Make sure BFF service is running on port 3000${NC}"
fi

# Rebuild Java MCP server
echo -e "\n${GREEN}Step 3: Rebuilding Java MCP server...${NC}"
cd services-java/mcp-tool-server
mvn clean package -DskipTests

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Java MCP server built successfully${NC}"
else
    echo -e "${RED}✗ Java build failed${NC}"
    exit 1
fi

cd ../..

echo -e "\n${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ UCP Cleanup Migration Complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "\nNext steps:"
echo -e "1. Restart all services: ${YELLOW}./scripts/manage-apps.sh restart all${NC}"
echo -e "2. Verify in Admin UI that categories show 'commerce' instead of 'cart'/'checkout'"
echo -e "3. Test the checkout flow in Chat UI"
