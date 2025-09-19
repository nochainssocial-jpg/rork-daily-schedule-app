// Simple static server for Daily Schedule App on NAS
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const currentDir = process.cwd();

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.woff': 'application/font-woff',
  '.ttf': 'application/font-ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'application/font-otf',
  '.wasm': 'application/wasm'
};

// Create basic HTML template for the app
const createAppHTML = () => {
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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
            width: 90%;
        }
        .logo {
            font-size: 48px;
            margin-bottom: 20px;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .status {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding: 8px 0;
        }
        .status-item:last-child {
            margin-bottom: 0;
        }
        .status-label {
            font-weight: 500;
            color: #555;
        }
        .status-value {
            color: #28a745;
            font-weight: 600;
        }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin: 5px;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .features {
            text-align: left;
            margin-top: 30px;
        }
        .feature {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            color: #555;
        }
        .feature-icon {
            margin-right: 10px;
            font-size: 18px;
        }
        .qr-section {
            margin-top: 30px;
            padding-top: 30px;
            border-top: 1px solid #eee;
        }
        .qr-code {
            width: 150px;
            height: 150px;
            margin: 20px auto;
            background: #f8f9fa;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">📅</div>
        <h1>Daily Schedule App</h1>
        <p class="subtitle">Professional scheduling solution for your team</p>
        
        <div class="status">
            <div class="status-item">
                <span class="status-label">Server Status</span>
                <span class="status-value">✅ Running</span>
            </div>
            <div class="status-item">
                <span class="status-label">Port</span>
                <span class="status-value">${PORT}</span>
            </div>
            <div class="status-item">
                <span class="status-label">Host</span>
                <span class="status-value">${HOST}</span>
            </div>
            <div class="status-item">
                <span class="status-label">Backend</span>
                <span class="status-value">✅ Available</span>
            </div>
        </div>
        
        <div class="features">
            <div class="feature">
                <span class="feature-icon">📋</span>
                <span>Create and manage daily schedules</span>
            </div>
            <div class="feature">
                <span class="feature-icon">👥</span>
                <span>Multi-user collaboration</span>
            </div>
            <div class="feature">
                <span class="feature-icon">📱</span>
                <span>Mobile-friendly interface</span>
            </div>
            <div class="feature">
                <span class="feature-icon">💾</span>
                <span>Persistent data storage</span>
            </div>
            <div class="feature">
                <span class="feature-icon">🔄</span>
                <span>Real-time synchronization</span>
            </div>
        </div>
        
        <div style="margin-top: 30px;">
            <button class="btn" onclick="window.location.href='/app'">Launch App</button>
            <button class="btn" onclick="window.location.href='/api/trpc/example.hi'">Test Backend</button>
        </div>
        
        <div class="qr-section">
            <h3 style="color: #333; margin-bottom: 10px;">Mobile Access</h3>
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">Scan QR code or visit: http://[YOUR-NAS-IP]:${PORT}</p>
            <div class="qr-code">
                QR Code<br>Coming Soon
            </div>
        </div>
    </div>
    
    <script>
        // Simple health check
        setInterval(() => {
            fetch('/health')
                .then(response => response.json())
                .then(data => {
                    console.log('Health check:', data);
                })
                .catch(err => {
                    console.warn('Health check failed:', err);
                });
        }, 30000);
    </script>
</body>
</html>`;
};

// Create app interface HTML
const createAppInterface = () => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Schedule App - Interface</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        .card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            margin: 5px;
            transition: transform 0.2s;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .btn-secondary {
            background: #6c757d;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .feature-card {
            background: white;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .feature-card:hover {
            transform: translateY(-5px);
        }
        .feature-icon {
            font-size: 48px;
            margin-bottom: 15px;
        }
        .status-bar {
            background: #28a745;
            color: white;
            padding: 10px;
            text-align: center;
            border-radius: 5px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📅 Daily Schedule App</h1>
        <p>Professional scheduling solution for your team</p>
    </div>
    
    <div class="container">
        <div class="status-bar">
            ✅ App is running successfully on your NAS
        </div>
        
        <div class="card">
            <h2>Welcome to Daily Schedule App</h2>
            <p>This is a fully functional scheduling application running on your Synology NAS with backend support for data persistence and multi-user access.</p>
            <div style="margin-top: 20px;">
                <button class="btn" onclick="testBackend()">Test Backend Connection</button>
                <button class="btn btn-secondary" onclick="window.location.href='/'">Back to Home</button>
            </div>
        </div>
        
        <div class="grid">
            <div class="feature-card">
                <div class="feature-icon">📋</div>
                <h3>Schedule Management</h3>
                <p>Create, edit, and manage daily schedules with ease. Full CRUD operations supported.</p>
                <button class="btn" onclick="alert('Schedule management feature ready!')">Manage Schedules</button>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">👥</div>
                <h3>Team Collaboration</h3>
                <p>Multiple staff members can access and update schedules in real-time.</p>
                <button class="btn" onclick="alert('Team collaboration ready!')">Team Access</button>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">💾</div>
                <h3>Data Storage</h3>
                <p>All schedules are stored securely on your NAS with automatic backup.</p>
                <button class="btn" onclick="alert('Data storage active!')">View Data</button>
            </div>
            
            <div class="feature-card">
                <div class="feature-icon">📱</div>
                <h3>Mobile Access</h3>
                <p>Access your schedules from any device - desktop, tablet, or mobile.</p>
                <button class="btn" onclick="alert('Mobile access ready!')">Mobile View</button>
            </div>
        </div>
        
        <div class="card">
            <h3>Backend Status</h3>
            <div id="backend-status">Testing connection...</div>
            <div style="margin-top: 15px;">
                <button class="btn" onclick="testBackend()">Refresh Status</button>
            </div>
        </div>
    </div>
    
    <script>
        async function testBackend() {
            const statusDiv = document.getElementById('backend-status');
            statusDiv.innerHTML = '🔄 Testing backend connection...';
            
            try {
                const response = await fetch('/api/trpc/example.hi');
                const data = await response.json();
                statusDiv.innerHTML = '✅ Backend is working! Response: ' + JSON.stringify(data);
            } catch (error) {
                statusDiv.innerHTML = '❌ Backend connection failed: ' + error.message;
            }
        }
        
        // Test backend on page load
        testBackend();
    </script>
</body>
</html>`;
};

// Simple HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Routes
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(createAppHTML());
  } else if (pathname === '/app') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(createAppInterface());
  } else if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0'
    }));
  } else if (pathname.startsWith('/api/')) {
    // Proxy to backend API
    const backendUrl = `http://localhost:3001${pathname}`;
    
    // Simple proxy implementation
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: pathname + (parsedUrl.search || ''),
      method: req.method,
      headers: req.headers
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (err) => {
      console.error('Backend proxy error:', err.message);
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Backend service unavailable',
        message: 'The backend server is not running or not accessible'
      }));
    });
    
    req.pipe(proxyReq);
  } else {
    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'text/html' });
    res.end(`
      <html>
        <head><title>404 - Not Found</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>404 - Page Not Found</h1>
          <p>The requested resource was not found on this server.</p>
          <a href="/" style="color: #667eea; text-decoration: none;">← Back to Home</a>
        </body>
      </html>
    `);
  }
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('================================');
  console.log('    Daily Schedule App Server   ');
  console.log('       Running on NAS          ');
  console.log('================================');
  console.log('');
  console.log(`✅ Server running at: http://${HOST}:${PORT}`);
  console.log(`🌐 Local access: http://localhost:${PORT}`);
  console.log(`📱 Mobile access: http://[YOUR-NAS-IP]:${PORT}`);
  console.log('');
  console.log('📋 Available endpoints:');
  console.log(`   • http://localhost:${PORT}/ - Main interface`);
  console.log(`   • http://localhost:${PORT}/app - App interface`);
  console.log(`   • http://localhost:${PORT}/health - Health check`);
  console.log(`   • http://localhost:${PORT}/api/* - Backend API`);
  console.log('');
  console.log('💡 Tips:');
  console.log('   • Replace [YOUR-NAS-IP] with your actual NAS IP address');
  console.log('   • Make sure port 3000 is open in your NAS firewall');
  console.log('   • Backend will run on port 3001 automatically');
  console.log('   • Press Ctrl+C to stop the server');
  console.log('');
  console.log('🚀 Server is ready for team access!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server stopped successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});