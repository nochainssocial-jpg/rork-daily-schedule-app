#!/bin/bash

# Daily Schedule App Startup Script for Synology NAS
# This script handles the startup of your React Native Expo app

echo "================================"
echo "    Daily Schedule App Starter   "
echo "       for Synology NAS          "
echo "================================"
echo ""

# Configuration
PORT=${PORT:-3000}
HOST="0.0.0.0"

echo "✅ Project files found"
echo "🔍 Checking runtime..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
else
    echo "✅ Dependencies found"
fi

echo ""
echo "🚀 Starting Daily Schedule App..."
echo "────────────────────────────────────────"
echo "📍 Server will run at: http://$HOST:$PORT"
echo "🌐 Local access: http://localhost:$PORT"
echo "📱 Mobile access: http://[YOUR-NAS-IP]:$PORT"
echo "────────────────────────────────────────"
echo ""
echo "💡 Tips:"
echo "   • Replace [YOUR-NAS-IP] with your actual NAS IP address"
echo "   • Make sure port $PORT is open in your NAS firewall"
echo "   • Press Ctrl+C to stop the server"
echo ""
echo "🔄 Starting development server..."
echo ""

# Start the server
node server.js