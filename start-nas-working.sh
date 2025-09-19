#!/bin/bash

# Daily Schedule App Startup Script for Synology NAS
# This script provides a working solution without requiring Expo CLI

echo "================================"
echo "    Daily Schedule App Starter   "
echo "       for Synology NAS          "
echo "================================"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if the project files exist
if [ ! -f "nas-server.js" ]; then
    echo "❌ nas-server.js not found in current directory"
    exit 1
fi

echo "✅ Project files found"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

echo "✅ Dependencies ready"
echo ""

echo "🚀 Starting Daily Schedule App..."
echo "────────────────────────────────────────"
echo "📍 Server will run at: http://0.0.0.0:3000"
echo "🌐 Local access: http://localhost:3000"
echo "📱 Mobile access: http://[YOUR-NAS-IP]:3000"
echo "────────────────────────────────────────"
echo ""
echo "💡 Tips:"
echo "   • Replace [YOUR-NAS-IP] with your actual NAS IP address"
echo "   • Make sure port 3000 is open in your NAS firewall"
echo "   • Press Ctrl+C to stop the server"
echo ""
echo "🔄 Starting server..."
echo ""

# Start the server
node nas-server.js