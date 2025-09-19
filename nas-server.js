const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');
const fs = require('fs');

// Simple HTTP server for serving the React Native Web build
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Serve static files
function serveStatic(req, res, filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    res.writeHead(404);
    res.end('File not found');
    return;
  }

  const ext = path.extname(fullPath);
  const contentType = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
  }[ext] || 'text/plain';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(fullPath).pipe(res);
}

// Simple HTML template for React Native Web
const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Daily Schedule App</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
        }
        #root {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 0 auto;
        }
        h1 {
            color: #333;
            margin-bottom: 1rem;
        }
        p {
            color: #666;
            line-height: 1.5;
            margin-bottom: 1.5rem;
        }
        .status {
            padding: 0.5rem 1rem;
            background: #e8f5e8;
            color: #2d5a2d;
            border-radius: 6px;
            display: inline-block;
            font-weight: 500;
        }
        .instructions {
            margin-top: 2rem;
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 8px;
            text-align: left;
        }
        .instructions h3 {
            margin-top: 0;
            color: #495057;
        }
        .instructions ol {
            padding-left: 1.2rem;
        }
        .instructions li {
            margin-bottom: 0.5rem;
            color: #6c757d;
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="container">
            <h1>📅 Daily Schedule App</h1>
            <div class="status">✅ Server Running Successfully</div>
            <p>Your Daily Schedule App is now running on your Synology NAS!</p>
            
            <div class="instructions">
                <h3>🚀 Next Steps:</h3>
                <ol>
                    <li>The server is running on port ${PORT}</li>
                    <li>Access it via your NAS IP: <strong>http://[NAS-IP]:${PORT}</strong></li>
                    <li>For mobile access, use the same URL on your phone's browser</li>
                    <li>To stop the server, press <strong>Ctrl+C</strong> in the terminal</li>
                </ol>
            </div>
            
            <div class="instructions">
                <h3>📱 Mobile App Features:</h3>
                <ol>
                    <li>Create and manage daily schedules</li>
                    <li>Set pickup and dropoff times</li>
                    <li>Share schedules with family</li>
                    <li>Export schedules as PDF</li>
                </ol>
            </div>
        </div>
    </div>
</body>
</html>
`;

const server = createServer((req, res) => {
  const { pathname } = parse(req.url, true);
  
  // Enable CORS for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Serve the main page
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(htmlTemplate);
    return;
  }

  // API health check
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      message: 'Daily Schedule App is running',
      timestamp: new Date().toISOString(),
      platform: 'Synology NAS'
    }));
    return;
  }

  // Serve static files
  if (pathname.startsWith('/assets/') || pathname.startsWith('/static/')) {
    serveStatic(req, res, pathname);
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'text/html' });
  res.end(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 2rem;">
        <h1>404 - Page Not Found</h1>
        <p>The requested page could not be found.</p>
        <a href="/">← Back to Home</a>
      </body>
    </html>
  `);
});

server.listen(PORT, HOST, () => {
  console.log('\n🎉 Daily Schedule App Server Started!');
  console.log('────────────────────────────────────────');
  console.log(`📍 Server running at: http://${HOST}:${PORT}`);
  console.log(`🌐 Local access: http://localhost:${PORT}`);
  console.log(`📱 Mobile access: http://[YOUR-NAS-IP]:${PORT}`);
  console.log('────────────────────────────────────────');
  console.log('\n💡 Tips:');
  console.log('   • Replace [YOUR-NAS-IP] with your actual NAS IP address');
  console.log('   • Make sure port 3000 is open in your NAS firewall');
  console.log('   • Press Ctrl+C to stop the server');
  console.log('\n🔄 Server is ready to accept connections...');
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