#!/bin/bash

set -e

echo "🚀 Commerce AI Admin Panel - Development Setup"
echo "=============================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
fi

echo ""
echo "✅ Starting development server..."
echo "   Admin UI will be available at: http://localhost:3001"
echo "   Make sure BFF is running at: http://localhost:3000"
echo ""
echo "🔐 Default login credentials:"
echo "   Username: admin"
echo "   Password: admin"
echo ""

npm run dev
