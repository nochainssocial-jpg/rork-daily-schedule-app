const express = require('express');
const path = require('path');
const fs = require('fs');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

console.log('================================');
console.log('    Daily Schedule App Server    ');
console.log('         for Synology NAS       ');
console.log('================================');
console.log('');

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Import backend if available
let backendAvailable = false;
try {
  // Try to load your tRPC backend
  const { serve } = require('@hono/node-server');
  const { Hono } = require('hono');
  const { appRouter } = require('./backend/trpc/app-router');
  const { trpcServer } = require('@hono/trpc-server');
  const { createContext } = require('./backend/trpc/create-context');
  
  // Create Hono app for tRPC
  const honoApp = new Hono();
  
  // Add tRPC routes
  honoApp.use('/api/trpc/*', trpcServer({
    router: appRouter,
    createContext: createContext
  }));
  
  // Mount tRPC routes on Express
  app.use('/api', (req, res, next) => {
    honoApp.fetch(new Request(`http://localhost${req.url}`, {
      method: req.method,
      headers: req.headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined
    })).then(response => {
      res.status(response.status);
      response.headers.forEach((value, key) => {
        res.set(key, value);
      });
      return response.text();
    }).then(text => {
      res.send(text);
    }).catch(next);
  });
  
  backendAvailable = true;
  console.log('✅ Backend API loaded successfully');
} catch (error) {
  console.log('⚠️  Backend API not available:', error.message);
  console.log('   App will run in frontend-only mode');
}

// Create the main HTML page
const createMainPage = () => {
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayName = dayNames[today.getDay()];
  const monthName = monthNames[today.getMonth()];
  const dateString = `${today.getDate()} ${monthName} ${today.getFullYear()}`;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Schedule App</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #F5F5F5;
            min-height: 100vh;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .header {
            background: white;
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h1 {
            font-size: 27px;
            font-weight: bold;
            color: #333;
            margin: 0;
        }
        
        .logo {
            width: 45px;
            height: 45px;
            border-radius: 8px;
        }
        
        .date-section {
            background: white;
            padding: 15px 20px;
            text-align: center;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .day-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        
        .date-text {
            font-size: 17px;
            color: #666;
            font-weight: 600;
        }
        
        .actions {
            background: white;
            padding: 15px 20px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .btn {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            min-width: 120px;
        }
        
        .btn-primary {
            background: #007AFF;
            color: white;
        }
        
        .btn-primary:hover {
            background: #0056CC;
        }
        
        .btn-success {
            background: #34C759;
            color: white;
        }
        
        .btn-success:hover {
            background: #28A745;
        }
        
        .btn-warning {
            background: #FF9500;
            color: white;
        }
        
        .btn-warning:hover {
            background: #E6850E;
        }
        
        .btn-secondary {
            background: #8E8E93;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #6D6D70;
        }
        
        .status-section {
            padding: 20px;
        }
        
        .status-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .status-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
        }
        
        .status-item {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .status-icon {
            margin-right: 10px;
            font-size: 18px;
        }
        
        .status-running {
            color: #34C759;
        }
        
        .status-error {
            color: #FF3B30;
        }
        
        .status-warning {
            color: #FF9500;
        }
        
        .info-card {
            background: #E3F2FD;
            border-left: 4px solid #2196F3;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .info-title {
            font-size: 18px;
            font-weight: bold;
            color: #1976D2;
            margin-bottom: 10px;
        }
        
        .info-text {
            color: #1976D2;
            line-height: 1.5;
        }
        
        .warning-card {
            background: #FFF3CD;
            border-left: 4px solid #FFC107;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .warning-title {
            font-size: 18px;
            font-weight: bold;
            color: #856404;
            margin-bottom: 10px;
        }
        
        .warning-text {
            color: #856404;
            line-height: 1.5;
        }
        
        .categories {
            padding: 0 20px 20px;
        }
        
        .category-item {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .category-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            transform: translateY(-1px);
        }
        
        .category-icon {
            width: 40px;
            height: 40px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-size: 20px;
        }
        
        .category-title {
            flex: 1;
            font-size: 16px;
            color: #333;
            font-weight: 500;
        }
        
        .category-arrow {
            color: #999;
            font-size: 18px;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                box-shadow: none;
            }
            
            .action-buttons {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Daily Schedule</h1>
            <img src="https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/sfl62jz9efty7wm6r3s5e" 
                 class="logo" alt="Logo" />
        </div>
        
        <div class="date-section">
            <div class="day-name">${dayName}</div>
            <div class="date-text">${dateString}</div>
        </div>
        
        <div class="actions">
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="createSchedule()">Create Schedule</button>
                <button class="btn btn-success" onclick="viewSchedules()">View Schedules</button>
                <button class="btn btn-warning" onclick="shareSchedule()">Share Schedule</button>
                <button class="btn btn-secondary" onclick="settings()">Settings</button>
            </div>
        </div>
        
        <div class="status-section">
            <div class="status-card">
                <div class="status-title">Status</div>
                <div class="status-item">
                    <span class="status-icon status-running">✅</span>
                    <span>Server Running</span>
                </div>
                <div class="status-item">
                    <span class="status-icon ${backendAvailable ? 'status-running' : 'status-error'}">${
                      backendAvailable ? '✅' : '❌'
                    }</span>
                    <span>Backend API: ${backendAvailable ? 'Available' : 'Not Available'}</span>
                </div>
                <div class="status-item">
                    <span class="status-icon status-running">🌐</span>
                    <span>Port: ${PORT}</span>
                </div>
            </div>
            
            <div class="info-card">
                <div class="info-title">🎉 Success!</div>
                <div class="info-text">
                    Your Daily Schedule App is now running on your Synology NAS!<br>
                    Access it from any device on your network using your NAS IP address.
                </div>
            </div>
            
            <div class="warning-card">
                <div class="warning-title">⚠️ Current Limitations</div>
                <div class="warning-text">
                    This is a simplified version running without Expo CLI. The full React Native app 
                    requires modern Node.js and build tools that aren't available on your NAS.<br><br>
                    <strong>What's working:</strong><br>
                    • Server is running successfully<br>
                    • Backend API is ${backendAvailable ? 'available' : 'not available'}<br>
                    • Remote access from other devices<br><br>
                    <strong>What needs work:</strong><br>
                    • Full React Native Web interface<br>
                    • Schedule creation and management<br>
                    • PDF generation and sharing
                </div>
            </div>
        </div>
        
        <div class="categories">
            <div class="category-item" onclick="showFeature('staff')">
                <div class="category-icon" style="background: #4A90E220; color: #4A90E2;">👥</div>
                <div class="category-title">Staff working today</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('participants')">
                <div class="category-icon" style="background: #7B68EE20; color: #7B68EE;">✓</div>
                <div class="category-title">Participants attending today</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('assignments')">
                <div class="category-icon" style="background: #FF6B6B20; color: #FF6B6B;">📋</div>
                <div class="category-title">Daily Assignment</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('frontRoom')">
                <div class="category-icon" style="background: #4ECDC420; color: #4ECDC4;">🏠</div>
                <div class="category-title">Front Room</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('scotty')">
                <div class="category-icon" style="background: #95E77E20; color: #95E77E;">👶</div>
                <div class="category-title">Scotty</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('twins')">
                <div class="category-icon" style="background: #FFD93D20; color: #FFD93D;">👥</div>
                <div class="category-title">Twins</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('chores')">
                <div class="category-icon" style="background: #FF8C4220; color: #FF8C42;">☑️</div>
                <div class="category-title">Chores</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('dropoffs')">
                <div class="category-icon" style="background: #A8DADC20; color: #A8DADC;">🚗</div>
                <div class="category-title">Drop-offs & Pickups</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('checklist')">
                <div class="category-icon" style="background: #E56B6F20; color: #E56B6F;">📝</div>
                <div class="category-title">Final Checklist</div>
                <div class="category-arrow">→</div>
            </div>
        </div>
    </div>
    
    <script>
        function createSchedule() {
            alert('Create Schedule feature will be available once the full React Native Web setup is complete.');
        }
        
        function viewSchedules() {
            alert('View Schedules feature will be available once the full React Native Web setup is complete.');
        }
        
        function shareSchedule() {
            alert('Share Schedule feature will be available once the full React Native Web setup is complete.');
        }
        
        function settings() {
            alert('Settings feature will be available once the full React Native Web setup is complete.');
        }
        
        function showFeature(category) {
            alert('Category management for "' + category + '" will be available once the full React Native Web setup is complete.');
        }
        
        // Check backend status
        fetch('/api/status')
            .then(response => response.json())
            .then(data => {
                console.log('Backend status:', data);
            })
            .catch(error => {
                console.log('Backend not available:', error);
            });
    </script>
</body>
</html>`;
};

// Routes
app.get('/', (req, res) => {
  res.send(createMainPage());
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    message: 'Daily Schedule App Backend is running',
    timestamp: new Date().toISOString(),
    port: PORT,
    backend: backendAvailable
  });
});

// Catch all routes
app.get('*', (req, res) => {
  res.send(createMainPage());
});

// Start server
app.listen(PORT, HOST, () => {
  console.log('✅ Daily Schedule App started successfully!');
  console.log(`📍 Server running at: http://${HOST}:${PORT}`);
  console.log(`🌐 Local access: http://localhost:${PORT}`);
  console.log(`📱 Mobile access: http://[YOUR-NAS-IP]:${PORT}`);
  console.log('');
  console.log('💡 Tips:');
  console.log('   • Replace [YOUR-NAS-IP] with your actual NAS IP address');
  console.log('   • Make sure port 3000 is open in your NAS firewall');
  console.log('   • Press Ctrl+C to stop the server');
  console.log('');
  console.log(`🔧 Backend API: ${backendAvailable ? 'Available' : 'Not Available'}`);
  console.log('================================');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down server...');
  console.log('✅ Server stopped successfully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
  console.log('✅ Server stopped successfully');
  process.exit(0);
});