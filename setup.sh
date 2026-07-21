#!/bin/bash

# SmartPay Docker Setup Script

set -e

echo "🚀 Setting up SmartPay..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Copy .env.example to .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env from .env.example..."
    cp .env.example .env
    
    # Generate encryption key
    ENCRYPTION_KEY=$(openssl rand -hex 16)
    JWT_SECRET=$(openssl rand -hex 32)
    
    # Update .env with generated keys
    sed -i '' "s/ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
    sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
    
    echo "✅ .env created with generated encryption keys"
    echo "⚠️  Please update .env with your actual API keys (Paystack, Ozow, Evolution API)"
fi

# Build and start containers
echo "🐳 Building and starting containers..."
docker-compose up -d --build

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Run migrations
echo "📦 Running database migrations..."
docker-compose exec app npm run migrate

echo ""
echo "✅ SmartPay is ready!"
echo ""
echo "📊 Services:"
echo "   - API: http://localhost:3000"
echo "   - PostgreSQL: localhost:5432"
echo "   - Evolution API: http://localhost:8080"
echo "   - Redis: localhost:6379"
echo ""
echo "📝 Next steps:"
echo "   1. Update .env with your Paystack, Ozow, and Evolution API keys"
echo "   2. Access the API at http://localhost:3000/api/v1"
echo "   3. Health check: http://localhost:3000/health"
