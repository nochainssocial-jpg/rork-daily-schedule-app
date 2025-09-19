const { serve } = require('@hono/node-server');
const { Hono } = require('hono');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

console.log('🚀 Starting Daily Schedule App...');
console.log(`📍 Server will run at: http://${HOST}:${PORT}`);
console.log(`🌐 Local access: http://localhost:${PORT}`);
console.log(`📱 Mobile access: http://[YOUR-NAS-IP]:${PORT}`);

// Create Hono app
const app = new Hono();

// Import your backend router
let backendAvailable = false;
try {
  const { appRouter } = require('./backend/trpc/app-router');
  const { trpcServer } = require('@hono/trpc-server');
  const { createContext } = require('./backend/trpc/create-context');
  
  // Add tRPC routes
  app.use('/api/trpc/*', trpcServer({
    router: appRouter,
    createContext: createContext
  }));
  
  backendAvailable = true;
  console.log('✅ Backend API routes loaded');
} catch (error) {
  console.log('⚠️  Backend API not available:', error.message);
}

// Serve the React Native Web app
const indexHtml = `
<!DOCTYPE html>
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
            background-color: #f5f5f5;
            overflow: hidden;
        }
        
        #root {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-size: 18px;
            color: #666;
        }
        
        .error {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            padding: 20px;
            text-align: center;
        }
        
        .error h1 {
            color: #e74c3c;
            margin-bottom: 10px;
        }
        
        .error p {
            color: #666;
            margin-bottom: 20px;
        }
        
        .retry-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        
        .retry-btn:hover {
            background: #2980b9;
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="loading">Loading Daily Schedule App...</div>
    </div>
    
    <script>
        // Simple React Native Web bootstrap
        window.__DEV__ = false;
        
        // Mock some React Native modules for web
        window.ReactNativeWebView = null;
        
        // Error handling
        window.onerror = function(msg, url, line, col, error) {
            console.error('App Error:', msg, error);
            document.getElementById('root').innerHTML = \`
                <div class="error">
                    <h1>App Error</h1>
                    <p>The Daily Schedule App encountered an error and needs to restart.</p>
                    <button class="retry-btn" onclick="location.reload()">Retry</button>
                </div>
            \`;
        };
        
        // Load the app
        try {
            // This would normally load your bundled React Native Web app
            // For now, we'll create a simple version
            setTimeout(() => {
                document.getElementById('root').innerHTML = \`
                    <div style="padding: 20px; height: 100vh; overflow-y: auto;">
                        <h1 style="color: #2c3e50; margin-bottom: 20px;">Daily Schedule App</h1>
                        <p style="color: #666; margin-bottom: 20px;">Your schedule management app is running on your NAS!</p>
                        
                        <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px;">
                            <h2 style="color: #34495e; margin-bottom: 15px;">Quick Actions</h2>
                            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                                <button style="background: #3498db; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">Create Schedule</button>
                                <button style="background: #2ecc71; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">View Schedules</button>
                                <button style="background: #e67e22; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">Settings</button>
                            </div>
                        </div>
                        
                        <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <h2 style="color: #34495e; margin-bottom: 15px;">Status</h2>
                            <p style="color: #27ae60; font-weight: bold;">✅ Server Running</p>
                            <p style="color: #666; margin-top: 5px;">Backend API: ${backendAvailable ? 'Available' : 'Not Available'}</p>
                            <p style="color: #666;">Port: ${PORT}</p>
                        </div>
                    </div>
                \`;
            }, 1000);
        } catch (error) {
            console.error('Failed to load app:', error);
            document.getElementById('root').innerHTML = \`
                <div class="error">
                    <h1>Failed to Load</h1>
                    <p>Could not start the Daily Schedule App.</p>
                    <button class="retry-btn" onclick="location.reload()">Retry</button>
                </div>
            \`;
        }
    </script>
</body>
</html>
`;

// Serve the main app
app.get('/', (c) => {
  return c.html(indexHtml);
});

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch all other routes and serve the app
app.get('*', (c) => {
  return c.html(indexHtml);
});

// Start server
serve({
  fetch: app.fetch,
  port: PORT,
  hostname: HOST
}, (info) => {
  console.log('✅ Daily Schedule App is running!');
  console.log(`🌐 Access your app at: http://localhost:${info.port}`);
  console.log('📱 Replace localhost with your NAS IP for remote access');
  console.log('\n💡 Press Ctrl+C to stop the server');
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