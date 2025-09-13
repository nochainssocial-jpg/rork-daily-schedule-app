#!/bin/bash

# Synology NAS Startup Script for Daily Schedule App
# Place this in your NAS and make it executable: chmod +x start-app.sh

echo "Starting Daily Schedule App on Synology NAS..."

# Set environment variables
export NODE_ENV=production
export EXPO_USE_FAST_RESOLVER=1

# Navigate to app directory (adjust path as needed)
cd /volume1/docker/daily-schedule-app

# Pull latest changes if using git
# git pull origin main

# Install/update dependencies
bun install

# Start the application
echo "Starting app on port 8081..."
bun run start-nas

echo "App should be available at http://YOUR_NAS_IP:8081"