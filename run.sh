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
    echo "🚀 Starting Daily Schedule App with full features..."
    ./start-app.sh
else
    echo "🚀 Starting with basic server..."
    echo "📍 Server will run at: http://0.0.0.0:3000"
    echo "🌐 Local access: http://localhost:3000"
    echo "📱 Mobile access: http://[YOUR-NAS-IP]:3000"
    echo ""
    echo "Starting backend server on port 3001..."
    node backend-nas.js &
    BACKEND_PID=$!
    
    echo "Starting frontend server on port 3000..."
    node serve-nas.js &
    FRONTEND_PID=$!
    
    echo ""
    echo "✅ Servers started!"
    echo "Press Ctrl+C to stop..."
    
    # Wait for interrupt
    trap 'kill $BACKEND_PID $FRONTEND_PID; echo "Servers stopped"; exit' INT
    wait
fi