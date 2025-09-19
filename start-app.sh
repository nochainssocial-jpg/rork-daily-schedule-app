#!/bin/bash

# Daily Schedule App Startup Script for Synology NAS
# This script starts both the frontend and backend servers

echo "================================"
echo "    Daily Schedule App Starter   "
echo "       for Synology NAS          "
echo "================================"
echo ""

# Configuration
FRONTEND_PORT=3000
BACKEND_PORT=3001
HOST="0.0.0.0"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ️${NC} $1"
}

# Check if project files exist
if [ ! -f "serve-nas.js" ] || [ ! -f "backend-nas.js" ]; then
    print_error "Required server files not found!"
    echo "Please make sure serve-nas.js and backend-nas.js exist in the current directory."
    exit 1
fi

print_status "Project files found"

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -eq 0 ]; then
    print_status "Node.js version: $NODE_VERSION"
else
    print_error "Node.js not found! Please install Node.js first."
    exit 1
fi

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        print_status "Backend server stopped"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        print_status "Frontend server stopped"
    fi
    echo "✅ All servers stopped successfully"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "🚀 Starting Daily Schedule App..."
echo "────────────────────────────────────────"
echo "📍 Frontend will run at: http://$HOST:$FRONTEND_PORT"
echo "🔧 Backend will run at: http://$HOST:$BACKEND_PORT"
echo "🌐 Local access: http://localhost:$FRONTEND_PORT"
echo "📱 Mobile access: http://[YOUR-NAS-IP]:$FRONTEND_PORT"
echo "────────────────────────────────────────"
echo ""
echo "💡 Tips:"
echo "   • Replace [YOUR-NAS-IP] with your actual NAS IP address"
echo "   • Make sure ports $FRONTEND_PORT and $BACKEND_PORT are open in your NAS firewall"
echo "   • Press Ctrl+C to stop both servers"
echo ""

# Start backend server
echo "🔧 Starting backend server..."
HOST=$HOST PORT=$BACKEND_PORT node backend-nas.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if kill -0 $BACKEND_PID 2>/dev/null; then
    print_status "Backend server started (PID: $BACKEND_PID)"
else
    print_error "Failed to start backend server"
    exit 1
fi

# Start frontend server
echo "🌐 Starting frontend server..."
HOST=$HOST PORT=$FRONTEND_PORT node serve-nas.js &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 2

# Check if frontend started successfully
if kill -0 $FRONTEND_PID 2>/dev/null; then
    print_status "Frontend server started (PID: $FRONTEND_PID)"
else
    print_error "Failed to start frontend server"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo ""
print_status "Both servers are running successfully!"
echo ""
echo "🌐 Access your app at:"
echo "   • Main interface: http://localhost:$FRONTEND_PORT"
echo "   • App interface: http://localhost:$FRONTEND_PORT/app"
echo "   • Backend API: http://localhost:$BACKEND_PORT/api/health"
echo ""
echo "🚀 Daily Schedule App is ready for team access!"
echo ""
echo "Press Ctrl+C to stop all servers..."

# Wait for both processes
wait