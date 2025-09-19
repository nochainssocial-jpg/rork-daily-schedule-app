const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get __dirname equivalent for CommonJS
const __dirname = process.cwd();

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Check if we have the necessary files
function checkProjectFiles() {
  const requiredFiles = [
    'package.json',
    'app.json',
    'app/_layout.tsx'
  ];
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(__dirname, file))) {
      console.error(`❌ Missing required file: ${file}`);
      return false;
    }
  }
  
  return true;
}

// Check if Expo CLI is available
function checkExpoCLI() {
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

// Start the Expo development server
function startExpoServer() {
  console.log('🚀 Starting Expo development server...');
  
  // Set environment variables for production-like behavior
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    EXPO_USE_FAST_RESOLVER: 'true',
    EXPO_USE_METRO_WORKSPACE_ROOT: 'true'
  };
  
  // Start Expo with web platform
  const expoProcess = spawn('npx', ['expo', 'start', '--web', '--port', PORT.toString(), '--host', HOST], {
    stdio: 'inherit',
    env: env,
    cwd: __dirname
  });
  
  expoProcess.on('error', (err) => {
    console.error('❌ Failed to start Expo server:', err?.message || 'Unknown error');
    console.log('\n💡 Troubleshooting tips:');
    console.log('   • Make sure you have Expo CLI installed: npm install -g @expo/cli');
    console.log('   • Check if all dependencies are installed: npm install');
    console.log('   • Verify the project structure is correct');
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

// Main startup function
async function startServer() {
  console.log('\n================================');
  console.log('    Daily Schedule App Starter   ');
  console.log('       for Synology NAS          ');
  console.log('================================\n');
  
  // Check if project files exist
  if (!checkProjectFiles()) {
    console.error('❌ Project files are missing. Please ensure all required files are present.');
    process.exit(1);
  }
  
  console.log('✅ Project files found');
  
  // Check if Expo CLI is available
  console.log('🔍 Checking Expo CLI...');
  const hasExpoCLI = await checkExpoCLI();
  
  if (!hasExpoCLI) {
    console.error('❌ Expo CLI not found. Installing...');
    
    // Try to install Expo CLI
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
        console.error('❌ Error installing Expo CLI:', err?.message || 'Unknown error');
        reject(err);
      });
    });
  } else {
    console.log('✅ Expo CLI found');
  }
  
  // Check if dependencies are installed
  console.log('📦 Checking dependencies...');
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    console.log('📦 Installing dependencies...');
    
    const installProcess = spawn('npm', ['install'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    await new Promise((resolve, reject) => {
      installProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Dependencies installed successfully');
          resolve(true);
        } else {
          console.error('❌ Failed to install dependencies');
          reject(new Error('Dependency installation failed'));
        }
      });
      
      installProcess.on('error', (err) => {
        console.error('❌ Error installing dependencies:', err?.message || 'Unknown error');
        reject(err);
      });
    });
  } else {
    console.log('✅ Dependencies found');
  }
  
  console.log('\n🚀 Starting Daily Schedule App...');
  console.log('────────────────────────────────────────');
  console.log(`📍 Server will run at: http://${HOST}:${PORT}`);
  console.log(`🌐 Local access: http://localhost:${PORT}`);
  console.log(`📱 Mobile access: http://[YOUR-NAS-IP]:${PORT}`);
  console.log('────────────────────────────────────────');
  console.log('\n💡 Tips:');
  console.log('   • Replace [YOUR-NAS-IP] with your actual NAS IP address');
  console.log('   • Make sure port 3000 is open in your NAS firewall');
  console.log('   • Press Ctrl+C to stop the server');
  console.log('\n🔄 Starting Expo development server...\n');
  
  // Start the Expo server
  startExpoServer();
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
startServer().catch((err) => {
  console.error('❌ Failed to start server:', err?.message || 'Unknown error');
  process.exit(1);
});