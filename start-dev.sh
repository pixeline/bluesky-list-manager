#!/bin/bash

# Start PHP backend server
echo "Starting PHP backend server on port 8000..."
php -S localhost:8000 &

# Wait a moment for PHP server to start
sleep 2

# Start Svelte development server
echo "Starting Svelte development server on port 5173..."
npm run dev &

# Wait for both servers
echo "Development servers started!"
echo "PHP backend: http://localhost:8000"
echo "Svelte frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for interrupt
wait