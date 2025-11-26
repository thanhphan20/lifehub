#!/bin/bash

set -e

echo "🚀 Setting up LifeHub..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start Kafka
echo "📦 Starting Kafka..."
docker-compose up -d

echo "⏳ Waiting for Kafka to be ready (30 seconds)..."
sleep 30

# Check if Kafka is healthy
if docker-compose ps | grep -q "kafka.*Up"; then
    echo "✅ Kafka is running"
else
    echo "❌ Kafka failed to start. Check logs with: docker-compose logs kafka"
    exit 1
fi

# Setup API Gateway
echo "🔧 Setting up API Gateway..."
cd services/api-gateway

if [ ! -d "node_modules" ]; then
    echo "📦 Installing API Gateway dependencies..."
    npm install
fi

if [ ! -f ".env" ] && [ -f "ENV.example" ]; then
    echo "📝 Creating .env file for API Gateway..."
    cp ENV.example .env
    echo "✅ Created .env file. You can modify it if needed."
fi

cd ../..

# Setup Notion Consumer
echo "🔧 Setting up Notion Consumer..."
cd services/notion-cosumer

if [ ! -d "node_modules" ]; then
    echo "📦 Installing Notion Consumer dependencies..."
    npm install
fi

if [ ! -f ".env" ] && [ -f "ENV.example" ]; then
    echo "📝 Creating .env file for Notion Consumer..."
    cp ENV.example .env
    echo "⚠️  Please update .env file with your Notion credentials:"
    echo "   - NOTION_TOKEN"
    echo "   - NOTION_DB_ID"
fi

cd ../..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update services/notion-cosumer/.env with your Notion credentials"
echo "2. Start API Gateway: cd services/api-gateway && npm run start:dev"
echo "3. Start Notion Consumer: cd services/notion-cosumer && npm start"
echo "4. Test the API: curl http://localhost:3000/health"
echo ""



