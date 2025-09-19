const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Use current working directory (avoiding __dirname conflicts)
const projectDir = process.cwd();

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
    if (!fs.existsSync(path.join(projectDir, file))) {
      console.error(`❌ Missing required file: ${file}`);
      return false;
    }
  }
  
  return true;
}

// Check if bun is available
function checkBun() {
  return new Promise((resolve) => {
    const checkProcess = spawn('bun', ['--version'], {
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

// Start the server directly with Node.js
function startServer() {
  console.log('🚀 Starting server with Node.js...');
  
  // Set environment variables
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: PORT.toString(),
    HOST: HOST
  };
  
  // Check if server.js exists
  const serverPath = path.join(projectDir, 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.error('❌ server.js not found. Please ensure the server file exists.');
    process.exit(1);
  }
  
  // Start the Node.js server directly
  console.log('Starting Node.js server...');
  const serverProcess = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: env,
    cwd: projectDir
  });
  
  serverProcess.on('error', (err) => {
    console.error('❌ Failed to start Node.js server:', err.message);
    console.log('\n💡 Troubleshooting tips:');
    console.log('   • Make sure Node.js is installed');
    console.log('   • Check if all dependencies are installed: npm install');
    console.log('   • Verify server.js exists in the project directory');
    process.exit(1);
  });
  
  serverProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Server exited with code ${code}`);
    }
    process.exit(code);
  });
  
  return serverProcess;
}

// Main startup function
async function startApp() {
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
  
  // Check if bun is available (preferred but not required)
  console.log('🔍 Checking runtime...');
  const hasBun = await checkBun();
  
  if (hasBun) {
    console.log('✅ Bun found (preferred)');
  } else {
    console.log('⚠️  Bun not found, will try npm as fallback');
  }
  
  // Check if dependencies are installed
  console.log('📦 Checking dependencies...');
  if (!fs.existsSync(path.join(projectDir, 'node_modules'))) {
    console.log('📦 Installing dependencies...');
    
    // Try bun first, fallback to npm
    const installCommand = hasBun ? 'bun' : 'npm';
    const installArgs = hasBun ? ['install'] : ['install'];
    
    const installProcess = spawn(installCommand, installArgs, {
      stdio: 'inherit',
      cwd: projectDir
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
  
  // Check if dist directory exists, if not, run build
  console.log('🏗️ Checking build files...');
  const distDir = path.join(projectDir, 'dist');
  if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
    console.log('📦 Building app for production...');
    
    // Run the build script
    const buildProcess = spawn('bash', ['build.sh'], {
      stdio: 'inherit',
      cwd: projectDir
    });
    
    await new Promise((resolve, reject) => {
      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Build completed successfully');
          resolve(true);
        } else {
          console.error('❌ Build failed');
          reject(new Error('Build process failed'));
        }
      });
      
      buildProcess.on('error', (err) => {
        console.error('❌ Error during build:', err?.message || 'Unknown error');
        reject(err);
      });
    });
  } else {
    console.log('✅ Build files found');
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
  console.log('\n🔄 Starting development server...\n');
  
  // Start the server
  startServer();
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

// Start the app
startApp().catch((err) => {
  console.error('❌ Failed to start server:', err?.message || 'Unknown error');
  process.exit(1);
});