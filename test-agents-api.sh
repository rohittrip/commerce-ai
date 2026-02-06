#!/bin/bash

echo "Testing Agents API Endpoint..."
echo ""

# Check if orchestration service is running
if ! lsof -ti:3001 > /dev/null; then
    echo "❌ Orchestration service is NOT running on port 3001"
    echo "   Start it with: cd apps/orchestration-service && npm run dev"
    exit 1
fi

echo "✅ Orchestration service is running on port 3001"
echo ""

# Test the agents endpoint
echo "Testing GET http://localhost:3001/admin/agents"
echo ""

response=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:3001/admin/agents)
http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE/d')

if [ "$http_code" = "200" ]; then
    echo "✅ API returned 200 OK"
    echo ""
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
    echo "❌ API returned HTTP $http_code"
    echo ""
    echo "Response:"
    echo "$body"
fi
