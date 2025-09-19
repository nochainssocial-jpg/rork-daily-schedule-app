// Simple Node.js server to run Expo web app on NAS
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get current directory
const currentDir = process.cwd();

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('🚀 Starting Daily Schedule App server...');
console.log(`📍 Server will run at: http://${HOST}:${PORT}`);
console.log(`🌐 Local access: http://localhost:${PORT}`);
console.log(`📱 Mobile access: http://[YOUR-NAS-IP]:${PORT}`);
console.log('\n💡 Starting Expo web server...');

// Check if expo is available
function checkExpo() {
  return new Promise((resolve) => {
    const checkProcess = spawn('npx', ['expo', '--version'], {
      stdio: 'pipe'
    });
    
    checkProcess.on('close', (code) => {
      resolve(code === 0);
    });
    
    checkProcess.on('error', () => {
      resolve(false);
    });
  });
}

// Start Expo web server
async function startExpoServer() {
  const hasExpo = await checkExpo();
  
  if (!hasExpo) {
    console.error('❌ Expo CLI not found. Installing...');
    
    // Install expo globally
    const installProcess = spawn('npm', ['install', '-g', '@expo/cli'], {
      stdio: 'inherit'
    });
    
    await new Promise((resolve, reject) => {
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Expo CLI installed successfully');
          resolve(true);
        } else {
          console.error('❌ Failed to install Expo CLI');
          reject(new Error('Expo CLI installation failed'));
        }
      });
      
      installProcess.on('error', (err) => {
        console.error('❌ Error installing Expo CLI:', err.message);
        reject(err);
      });
    });
  }
  
  // Set environment variables
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    EXPO_USE_FAST_RESOLVER: 'true',
    EXPO_NO_TELEMETRY: '1'
  };
  
  // Start Expo web server
  console.log('🌐 Starting Expo web server...');
  const expoProcess = spawn('npx', ['expo', 'start', '--web', '--port', PORT.toString(), '--host', HOST, '--no-dev', '--minify'], {
    stdio: 'inherit',
    env: env,
    cwd: currentDir
  });
  
  expoProcess.on('error', (err) => {
    console.error('❌ Failed to start Expo server:', err.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   • Make sure Node.js is installed');
    console.log('   • Check if all dependencies are installed: npm install');
    console.log('   • Try running: npx expo install --fix');
    process.exit(1);
  });
  
  expoProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Expo server exited with code ${code}`);
    }
    process.exit(code);
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
startExpoServer().catch((err) => {
  console.error('❌ Failed to start server:', err.message);
  process.exit(1);
});

console.log('✅ Server startup initiated!');