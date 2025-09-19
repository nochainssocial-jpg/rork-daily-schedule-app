const { serve } = require('@hono/node-server');
const path = require('path');
const fs = require('fs');

// Define __dirname for CommonJS compatibility
const __dirname = path.dirname(require.main.filename);

// Import the Hono app (we'll need to transpile TypeScript)
const { Hono } = require('hono');
const { cors } = require('hono/cors');
const { serveStatic } = require('@hono/node-server/serve-static');

const app = new Hono();

// Enable CORS
app.use('*', cors());

// Serve static files from a dist or build directory if it exists
const staticDir = path.join(__dirname, 'dist');
if (fs.existsSync(staticDir)) {
  app.use('/*', serveStatic({ root: './dist' }));
}

// API health check
app.get('/api', (c) => {
  return c.json({ status: 'ok', message: 'Daily Schedule App API is running' });
});

// Fallback for SPA routing
app.get('*', (c) => {
  const indexPath = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    return c.html(fs.readFileSync(indexPath, 'utf8'));
  }
  return c.html(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Daily Schedule App</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head>
    <body>
      <div id="root">
        <h1>Daily Schedule App</h1>
        <p>Server is running but no build files found.</p>
        <p>Please build the app first or check the deployment.</p>
      </div>
    </body>
    </html>
  `);
});

const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

console.log(`🚀 Starting Daily Schedule App server...`);
console.log(`📍 Server running at: http://${host}:${port}`);
console.log(`🌐 Local access: http://localhost:${port}`);
console.log(`📱 Mobile access: http://[YOUR-NAS-IP]:${port}`);

serve({
  fetch: app.fetch,
  port: parseInt(port),
  hostname: host,
});

console.log('✅ Server started successfully!');