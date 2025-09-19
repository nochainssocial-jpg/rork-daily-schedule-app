// Backend server for Daily Schedule App on NAS
const http = require('http');
const url = require('url');

// Configuration
const PORT = process.env.BACKEND_PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Simple in-memory storage for schedules
let schedules = [];
let nextId = 1;

// Helper function to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Helper function to send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  try {
    // API Routes
    if (pathname === '/api/trpc/example.hi') {
      if (method === 'GET') {
        sendJSON(res, 200, {
          result: {
            data: {
              message: 'Hello from Daily Schedule App backend!',
              timestamp: new Date().toISOString(),
              status: 'Backend is working correctly',
              version: '1.0.0'
            }
          }
        });
        return;
      }
    }

    // Schedules API
    if (pathname === '/api/schedules') {
      if (method === 'GET') {
        sendJSON(res, 200, {
          success: true,
          data: schedules,
          count: schedules.length
        });
        return;
      }

      if (method === 'POST') {
        const body = await parseBody(req);
        const newSchedule = {
          id: nextId++,
          title: body.title || 'Untitled Schedule',
          date: body.date || new Date().toISOString().split('T')[0],
          items: body.items || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        schedules.push(newSchedule);
        sendJSON(res, 201, {
          success: true,
          data: newSchedule,
          message: 'Schedule created successfully'
        });
        return;
      }
    }

    // Individual schedule operations
    const scheduleMatch = pathname.match(/^\/api\/schedules\/(\d+)$/);
    if (scheduleMatch) {
      const scheduleId = parseInt(scheduleMatch[1]);
      const scheduleIndex = schedules.findIndex(s => s.id === scheduleId);

      if (method === 'GET') {
        if (scheduleIndex === -1) {
          sendJSON(res, 404, {
            success: false,
            error: 'Schedule not found'
          });
          return;
        }
        sendJSON(res, 200, {
          success: true,
          data: schedules[scheduleIndex]
        });
        return;
      }

      if (method === 'PUT') {
        if (scheduleIndex === -1) {
          sendJSON(res, 404, {
            success: false,
            error: 'Schedule not found'
          });
          return;
        }
        const body = await parseBody(req);
        const updatedSchedule = {
          ...schedules[scheduleIndex],
          ...body,
          id: scheduleId, // Ensure ID doesn't change
          updatedAt: new Date().toISOString()
        };
        schedules[scheduleIndex] = updatedSchedule;
        sendJSON(res, 200, {
          success: true,
          data: updatedSchedule,
          message: 'Schedule updated successfully'
        });
        return;
      }

      if (method === 'DELETE') {
        if (scheduleIndex === -1) {
          sendJSON(res, 404, {
            success: false,
            error: 'Schedule not found'
          });
          return;
        }
        const deletedSchedule = schedules.splice(scheduleIndex, 1)[0];
        sendJSON(res, 200, {
          success: true,
          data: deletedSchedule,
          message: 'Schedule deleted successfully'
        });
        return;
      }
    }

    // Health check
    if (pathname === '/api/health') {
      sendJSON(res, 200, {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        schedules: schedules.length
      });
      return;
    }

    // Stats endpoint
    if (pathname === '/api/stats') {
      sendJSON(res, 200, {
        success: true,
        data: {
          totalSchedules: schedules.length,
          recentSchedules: schedules.slice(-5),
          serverUptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // 404 for unknown routes
    sendJSON(res, 404, {
      success: false,
      error: 'API endpoint not found',
      path: pathname,
      method: method
    });

  } catch (error) {
    console.error('API Error:', error.message);
    sendJSON(res, 500, {
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('================================');
  console.log('  Daily Schedule App Backend   ');
  console.log('       Running on NAS          ');
  console.log('================================');
  console.log('');
  console.log(`✅ Backend running at: http://${HOST}:${PORT}`);
  console.log(`🌐 Local access: http://localhost:${PORT}`);
  console.log('');
  console.log('📋 Available API endpoints:');
  console.log(`   • GET  /api/health - Health check`);
  console.log(`   • GET  /api/stats - Server statistics`);
  console.log(`   • GET  /api/trpc/example.hi - Test endpoint`);
  console.log(`   • GET  /api/schedules - Get all schedules`);
  console.log(`   • POST /api/schedules - Create new schedule`);
  console.log(`   • GET  /api/schedules/:id - Get specific schedule`);
  console.log(`   • PUT  /api/schedules/:id - Update schedule`);
  console.log(`   • DELETE /api/schedules/:id - Delete schedule`);
  console.log('');
  console.log('💾 Data storage: In-memory (schedules will persist during session)');
  console.log('🔄 CORS enabled for cross-origin requests');
  console.log('');
  console.log('🚀 Backend is ready for API requests!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Shutting down backend server...');
  server.close(() => {
    console.log('✅ Backend server stopped successfully');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Backend server stopped successfully');
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