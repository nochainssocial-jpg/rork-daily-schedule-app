#!/bin/bash

# Simple startup script for Synology NAS
# This script starts the Daily Schedule App without requiring Docker or Bun

echo "================================"
echo "  Daily Schedule App Starter   "
echo "     for Synology NAS          "
echo "================================"
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed."
    echo "Please install Node.js from the Synology Package Center."
    exit 1
fi

echo "[INFO] Node.js version: $(node --version)"
echo "[INFO] NPM version: $(npm --version)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "[ERROR] package.json not found. Please run this script from the app directory."
    exit 1
fi

echo "[STEP] Starting the Daily Schedule App server..."
echo ""

# Start the simple Node.js server
node nas-server.js