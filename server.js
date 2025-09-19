// Simple Node.js server to run Expo web app on NAS
const { spawn } = require('child_process');

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

console.log('🚀 Starting Daily Schedule App server...');
console.log(`📍 Server will run at: http://${HOST}:${PORT}`);
console.log(`🌐 Local access: http://localhost:${PORT}`);
console.log(`📱 Mobile access: http://[YOUR-NAS-IP]:${PORT}`);
console.log('\n💡 Starting Expo web server...');

// Start Expo web server with compatibility settings
function startExpoServer() {
  console.log('🌐 Starting Expo web server...');
  
  // Set environment variables for compatibility
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    EXPO_USE_FAST_RESOLVER: 'true',
    EXPO_NO_TELEMETRY: '1',
    EXPO_NO_UPDATE_CHECK: '1'
  };
  
  // Start Expo web server with compatibility flags
  const expoProcess = spawn('npx', [
    'expo', 'start', 
    '--web', 
    '--port', PORT.toString(), 
    '--host', HOST,
    '--no-dev',
    '--clear'
  ], {
    stdio: 'inherit',
    env: env,
    cwd: process.cwd()
  });
  
  expoProcess.on('error', (err) => {
    console.error('❌ Failed to start Expo server:', err.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   • Make sure Node.js is installed');
    console.log('   • Check if all dependencies are installed: npm install');
    console.log('   • Try running: npx expo install --fix');
    console.log('   • Make sure Expo CLI is available: npm install -g @expo/cli');
    process.exit(1);
  });
  
  expoProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Expo server exited with code ${code}`);
    }
    process.exit(code || 0);
  });
  
  return expoProcess;
}

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

// Start the server
console.log('✅ Server startup initiated!');
startExpoServer();