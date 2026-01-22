#!/bin/bash

echo "🔄 Restarting development server with cache clear..."
echo ""

# Stop any running dev servers
echo "📛 Stopping existing servers..."
killall node 2>/dev/null
sleep 1

# Clear caches
echo "🧹 Clearing caches..."
rm -rf node_modules/.vite
rm -rf dist

# Start dev server
echo "🚀 Starting dev server..."
npm run dev
