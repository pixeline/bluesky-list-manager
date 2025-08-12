#!/bin/bash

# Bluesky List Manager - Deployment Script
echo "🚀 Preparing Bluesky List Manager for deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Add all files
echo "📝 Adding files to git..."
git add .

# Check if there are changes to commit
if git diff --cached --quiet; then
    echo "✅ No changes to commit"
else
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "Fix profile loading and member count issues

- Fix profile API to handle direct response format (not wrapped in data field)
- Update dropdown to show real-time member count instead of stale listItemCount
- Add comprehensive debug logging to list-members and profiles APIs
- Improve error handling and retry functionality for profile loading
- Fix hydration issues with profile components
- Add better fallback display with retry buttons"
fi

# Build the application
echo "🔨 Building application for production..."
NODE_ENV=production npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo ""
    echo "📋 Deployment Summary:"
    echo "======================"
    echo "• Profile loading fixed - now properly parses API responses"
    echo "• Member count discrepancy resolved - dropdown shows real-time count"
    echo "• Enhanced debug logging for troubleshooting"
    echo "• Improved error handling and user feedback"
    echo "• Application built and ready for deployment"
    echo ""
    echo "🚀 Ready for deployment!"
    echo "   - Frontend: dist/ directory contains built files"
    echo "   - Backend: api/ directory contains PHP endpoints"
    echo "   - Configuration: Check docker-compose.yml for container setup"
else
    echo "❌ Build failed! Please check the error messages above."
    exit 1
fi