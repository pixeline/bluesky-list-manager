#!/bin/bash

echo "🚀 Starting Bluesky List Manager with Docker Compose..."
echo ""

# Stop any existing containers
echo "🛑 Stopping any existing containers..."
docker-compose down

# Start the services
echo "🔧 Starting PHP API and Node.js services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "✅ Application is starting up!"
echo ""
echo "🌐 Access URLs:"
echo "   • Svelte App (Frontend): http://localhost:5173"
echo "   • PHP API (Backend):     http://localhost:8000"
echo ""
echo "📝 To view logs:"
echo "   • All services: docker-compose logs -f"
echo "   • Node.js only: docker-compose logs -f node-app"
echo "   • PHP API only: docker-compose logs -f php-api"
echo ""
echo "🛑 To stop: docker-compose down"
echo ""
echo "🔄 The Svelte app will automatically reload when you make changes to the code."