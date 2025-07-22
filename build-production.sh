#!/bin/bash

echo "🔨 Building for production..."

# Clean previous build
rm -rf dist

# Set environment variables for production
export NODE_ENV=production
export VITE_MODE=production

# Build the application
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"

    # Check the built configuration
    echo "🔍 Checking built configuration..."
    if grep -q 'apiBase:"./api"' dist/assets/*.js; then
        echo "✅ API base path is correct (./api)"
    else
        echo "❌ API base path is incorrect"
        grep -o 'apiBase:"[^"]*"' dist/assets/*.js
    fi

    echo ""
    echo "📋 Production build summary:"
    echo "• Environment: Production"
    echo "• Base path: ./"
    echo "• API base: ./api"
    echo "• Output: dist/ directory"
else
    echo "❌ Build failed!"
    exit 1
fi