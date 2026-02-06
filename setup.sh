#!/bin/bash

set -e

echo "🚀 Commerce AI Platform - Setup Script"
echo "======================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your LLM API keys before proceeding."
    echo "   At least one of: OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_API_KEY"
    echo ""
    read -p "Press Enter after updating .env file, or Ctrl+C to exit..."
fi

# Verify at least one API key is set
if ! grep -qE '(OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY)=.+' .env; then
    echo "⚠️  Warning: No LLM API keys found in .env"
    echo "   The system will start but LLM features won't work without API keys."
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🐳 Starting Docker services..."
docker-compose down -v
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Wait for services
echo "   Waiting for Postgres..."
until docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do
    sleep 2
done

echo "   Waiting for Redis..."
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    sleep 2
done

echo "   Waiting for Tool Server..."
until curl -sf http://localhost:8081/api/v1/tools/health > /dev/null 2>&1; do
    sleep 3
done

echo "   Waiting for BFF..."
until curl -sf http://localhost:3000/api > /dev/null 2>&1; do
    sleep 3
done

echo ""
echo "✅ All services are up and running!"
echo ""
echo "📍 Service URLs:"
echo "   - Admin UI:          http://localhost:3001"
echo "   - BFF API & Docs:    http://localhost:3000/api"
echo "   - Tool Server:       http://localhost:8081"
echo "   - Postgres:          localhost:5432"
echo "   - Redis:             localhost:6379"
echo ""
echo "🔐 Default Credentials:"
echo "   Customer: testuser / test123"
echo "   Admin:    admin / admin"
echo ""
echo "📖 Quick Test:"
echo "   curl -X POST http://localhost:3000/v1/auth/login \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"username\":\"testuser\",\"password\":\"test123\"}'"
echo ""
echo "📊 View Logs:"
echo "   docker-compose logs -f bff"
echo "   docker-compose logs -f tool-server"
echo ""
echo "🎉 Setup complete! Read README.md for API documentation."
