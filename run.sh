#!/bin/bash

# Simple startup script for Daily Schedule App on NAS
echo "================================"
echo "    Daily Schedule App         "
echo "       Simple Startup          "
echo "================================"
echo ""

# Make the startup script executable
chmod +x start-app.sh

# Check if the detailed startup script exists
if [ -f "start-app.sh" ]; then
    echo "🚀 Starting Daily Schedule App..."
    ./start-app.sh
else
    echo "🚀 Starting with Node.js server..."
    echo "📍 Server will run at: http://0.0.0.0:3000"
    echo "🌐 Local access: http://localhost:3000"
    echo "📱 Mobile access: http://[YOUR-NAS-IP]:3000"
    echo ""
    echo "Starting server..."
    node server.js
fi