#!/bin/bash

# Bluesky Profile Catcher - Startup Script

set -e

echo "🦋 Starting Bluesky Profile Catcher..."

# Function to display help
show_help() {
    echo "Usage: ./start.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  dev         Start development server"
    echo "  docker      Start with Docker Compose"
    echo "  prod        Start production Docker setup"
    echo "  build       Build the application"
    echo "  install     Install dependencies"
    echo "  help        Show this help message"
    echo ""
}

# Function to check if Docker is available
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed or not in PATH"
        echo "Please install Docker to use this option"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed or not in PATH"
        echo "Please install Docker Compose to use this option"
        exit 1
    fi
}

# Function to check if Node.js is available
check_node() {
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed or not in PATH"
        echo "Please install Node.js 20+ to use this option"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed or not in PATH"
        echo "Please install npm to use this option"
        exit 1
    fi
}

# Main logic
case "${1:-help}" in
    "dev")
        echo "🚀 Starting development server..."
        check_node

        if [ ! -d "node_modules" ]; then
            echo "📦 Installing dependencies..."
            npm install
        fi

        echo "🌐 Starting server at http://localhost:3000"
        npm run dev
        ;;

        "docker")
        echo "🐳 Starting with Docker..."
        check_docker

        # Ensure package-lock.json exists for Docker build
        if [ ! -f "package-lock.json" ]; then
            echo "📦 Generating package-lock.json for Docker build..."
            if command -v node &> /dev/null; then
                npm install --package-lock-only
            else
                echo "⚠️  No package-lock.json found, Docker will generate it"
            fi
        fi

        docker-compose up -d
        echo "✅ Started! Visit http://localhost:3000"
        ;;

    "prod")
        echo "🚀 Starting production setup..."
        check_docker

        # Ensure package-lock.json exists for Docker build
        if [ ! -f "package-lock.json" ]; then
            echo "📦 Generating package-lock.json for production build..."
            if command -v node &> /dev/null; then
                npm install --package-lock-only
            else
                echo "⚠️  No package-lock.json found, Docker will generate it"
            fi
        fi

        docker-compose -f docker-compose.prod.yml up -d
        echo "✅ Production server started!"
        ;;

    "build")
        echo "🔨 Building application..."
        check_node
        npm run build
        echo "✅ Build complete!"
        ;;

    "install")
        echo "📦 Installing dependencies..."
        check_node
        npm install
        echo "✅ Dependencies installed!"
        ;;

    "help")
        show_help
        ;;

    *)
        echo "❌ Unknown option: $1"
        echo ""
        show_help
        exit 1
        ;;
esac