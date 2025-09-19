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

// Function to generate the React Native Web app
function getReactNativeWebApp() {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Daily Schedule App</title>
    <style>
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
        }
        .app {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 1rem;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 1.5rem;
        }
        .tab-bar {
            display: flex;
            background: white;
            border-top: 1px solid #e0e0e0;
            position: fixed;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 100%;
            max-width: 400px;
        }
        .tab {
            flex: 1;
            padding: 0.75rem;
            text-align: center;
            background: none;
            border: none;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .tab.active {
            background: #f0f0f0;
            color: #667eea;
        }
        .tab:hover {
            background: #f8f8f8;
        }
        .content {
            padding: 1rem;
            padding-bottom: 80px;
        }
        .schedule-item {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .schedule-time {
            font-weight: bold;
            color: #667eea;
            margin-bottom: 0.5rem;
        }
        .schedule-activity {
            color: #333;
        }
        .btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            margin: 0.5rem;
        }
        .btn:hover {
            background: #5a6fd8;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
        }
        .form-group input, .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 1rem;
        }
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="app">
        <div class="header">
            <h1>📅 Daily Schedule</h1>
        </div>
        
        <!-- Home Tab -->
        <div id="home-tab" class="content">
            <h2>Today's Schedule</h2>
            <div id="schedule-list">
                <div class="schedule-item">
                    <div class="schedule-time">7:00 AM</div>
                    <div class="schedule-activity">Wake up & Morning routine</div>
                </div>
                <div class="schedule-item">
                    <div class="schedule-time">8:30 AM</div>
                    <div class="schedule-activity">Drop off at school</div>
                </div>
                <div class="schedule-item">
                    <div class="schedule-time">3:00 PM</div>
                    <div class="schedule-activity">Pick up from school</div>
                </div>
                <div class="schedule-item">
                    <div class="schedule-time">6:00 PM</div>
                    <div class="schedule-activity">Dinner time</div>
                </div>
            </div>
            <button class="btn" onclick="showTab('create')">+ Add New Schedule</button>
        </div>
        
        <!-- Create Tab -->
        <div id="create-tab" class="content hidden">
            <h2>Create Schedule</h2>
            <form id="schedule-form">
                <div class="form-group">
                    <label>Time:</label>
                    <input type="time" id="schedule-time" required>
                </div>
                <div class="form-group">
                    <label>Activity:</label>
                    <input type="text" id="schedule-activity" placeholder="Enter activity" required>
                </div>
                <div class="form-group">
                    <label>Type:</label>
                    <select id="schedule-type">
                        <option value="routine">Daily Routine</option>
                        <option value="pickup">Pickup</option>
                        <option value="dropoff">Drop-off</option>
                        <option value="meal">Meal</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <button type="submit" class="btn">Save Schedule</button>
                <button type="button" class="btn" onclick="showTab('home')" style="background: #6c757d;">Cancel</button>
            </form>
        </div>
        
        <!-- Share Tab -->
        <div id="share-tab" class="content hidden">
            <h2>Share Schedule</h2>
            <p>Share your daily schedule with family members:</p>
            <button class="btn" onclick="shareSchedule()">📱 Share via SMS</button>
            <button class="btn" onclick="exportPDF()">📄 Export as PDF</button>
            <button class="btn" onclick="copyLink()">🔗 Copy Link</button>
        </div>
        
        <!-- Settings Tab -->
        <div id="settings-tab" class="content hidden">
            <h2>Settings</h2>
            <div class="form-group">
                <label>Family Name:</label>
                <input type="text" id="family-name" placeholder="Enter family name">
            </div>
            <div class="form-group">
                <label>Notification Time:</label>
                <select id="notification-time">
                    <option value="5">5 minutes before</option>
                    <option value="10">10 minutes before</option>
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                </select>
            </div>
            <button class="btn" onclick="saveSettings()">Save Settings</button>
        </div>
        
        <!-- Tab Bar -->
        <div class="tab-bar">
            <button class="tab active" onclick="showTab('home')">🏠 Home</button>
            <button class="tab" onclick="showTab('create')">➕ Create</button>
            <button class="tab" onclick="showTab('share')">📤 Share</button>
            <button class="tab" onclick="showTab('settings')">⚙️ Settings</button>
        </div>
    </div>
    
    <script>
        let schedules = JSON.parse(localStorage.getItem('schedules') || '[]');
        
        function showTab(tabName) {
            // Hide all tabs
            document.querySelectorAll('.content').forEach(tab => {
                tab.classList.add('hidden');
            });
            
            // Remove active class from all tab buttons
            document.querySelectorAll('.tab').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Show selected tab
            document.getElementById(tabName + '-tab').classList.remove('hidden');
            
            // Add active class to selected tab button
            event.target.classList.add('active');
        }
        
        function addSchedule(time, activity, type) {
            const schedule = {
                id: Date.now(),
                time: time,
                activity: activity,
                type: type
            };
            
            schedules.push(schedule);
            schedules.sort((a, b) => a.time.localeCompare(b.time));
            localStorage.setItem('schedules', JSON.stringify(schedules));
            renderSchedules();
        }
        
        function renderSchedules() {
            const scheduleList = document.getElementById('schedule-list');
            scheduleList.innerHTML = '';
            
            schedules.forEach(schedule => {
                const item = document.createElement('div');
                item.className = 'schedule-item';
                
                const timeFormatted = new Date('2000-01-01T' + schedule.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                item.innerHTML = \`
                    <div class="schedule-time">\${timeFormatted}</div>
                    <div class="schedule-activity">\${schedule.activity}</div>
                \`;
                
                scheduleList.appendChild(item);
            });
        }
        
        function shareSchedule() {
            const scheduleText = schedules.map(s => {
                const time = new Date('2000-01-01T' + s.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                return \`\${time} - \${s.activity}\`;
            }).join('\\n');
            
            if (navigator.share) {
                navigator.share({
                    title: 'Daily Schedule',
                    text: 'Here\'s our daily schedule:\\n\\n' + scheduleText
                });
            } else {
                navigator.clipboard.writeText('Daily Schedule:\\n\\n' + scheduleText);
                alert('Schedule copied to clipboard!');
            }
        }
        
        function exportPDF() {
            alert('PDF export feature coming soon!');
        }
        
        function copyLink() {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
        
        function saveSettings() {
            const familyName = document.getElementById('family-name').value;
            const notificationTime = document.getElementById('notification-time').value;
            
            localStorage.setItem('familyName', familyName);
            localStorage.setItem('notificationTime', notificationTime);
            
            alert('Settings saved!');
        }
        
        // Form submission
        document.getElementById('schedule-form').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const time = document.getElementById('schedule-time').value;
            const activity = document.getElementById('schedule-activity').value;
            const type = document.getElementById('schedule-type').value;
            
            addSchedule(time, activity, type);
            
            // Clear form
            this.reset();
            
            // Go back to home tab
            showTab('home');
        });
        
        // Load saved settings
        document.addEventListener('DOMContentLoaded', function() {
            const familyName = localStorage.getItem('familyName');
            const notificationTime = localStorage.getItem('notificationTime');
            
            if (familyName) {
                document.getElementById('family-name').value = familyName;
            }
            
            if (notificationTime) {
                document.getElementById('notification-time').value = notificationTime;
            }
            
            renderSchedules();
        });
    </script>
</body>
</html>
  `;
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
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        #root {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
        }
        .app-container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 400px;
            width: 100%;
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 1.8rem;
            font-weight: 600;
        }
        .header p {
            margin: 0.5rem 0 0 0;
            opacity: 0.9;
            font-size: 0.9rem;
        }
        .content {
            padding: 2rem;
        }
        .status {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 1rem;
            background: #e8f5e8;
            color: #2d5a2d;
            border-radius: 12px;
            margin-bottom: 1.5rem;
            font-weight: 500;
        }
        .feature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin: 1.5rem 0;
        }
        .feature-card {
            padding: 1rem;
            background: #f8f9fa;
            border-radius: 12px;
            text-align: center;
            border: 2px solid transparent;
            transition: all 0.2s ease;
        }
        .feature-card:hover {
            border-color: #667eea;
            transform: translateY(-2px);
        }
        .feature-icon {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }
        .feature-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: #333;
            margin: 0;
        }
        .instructions {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 1.5rem;
            margin-top: 1.5rem;
        }
        .instructions h3 {
            margin: 0 0 1rem 0;
            color: #495057;
            font-size: 1.1rem;
        }
        .step {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            margin-bottom: 1rem;
        }
        .step-number {
            background: #667eea;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.8rem;
            font-weight: 600;
            flex-shrink: 0;
        }
        .step-text {
            color: #6c757d;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        .access-info {
            background: #e3f2fd;
            border: 1px solid #bbdefb;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 1rem;
        }
        .access-info strong {
            color: #1976d2;
        }
        @media (max-width: 480px) {
            .app-container {
                margin: 0;
                border-radius: 0;
                min-height: 100vh;
            }
            .feature-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div id="root">
        <div class="app-container">
            <div class="header">
                <h1>📅 Daily Schedule App</h1>
                <p>Manage your family's daily schedules</p>
            </div>
            
            <div class="content">
                <div class="status">
                    <span>✅</span>
                    <span>Server Running Successfully</span>
                </div>
                
                <div class="feature-grid">
                    <div class="feature-card">
                        <div class="feature-icon">📋</div>
                        <div class="feature-title">Create Schedules</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🚗</div>
                        <div class="feature-title">Pickup & Dropoff</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">👨‍👩‍👧‍👦</div>
                        <div class="feature-title">Share with Family</div>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">📄</div>
                        <div class="feature-title">Export PDF</div>
                    </div>
                </div>
                
                <div class="instructions">
                    <h3>🚀 Getting Started</h3>
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-text">Server is running on port ${PORT}</div>
                    </div>
                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-text">Access from any device on your network</div>
                    </div>
                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-text">Start creating your daily schedules</div>
                    </div>
                    
                    <div class="access-info">
                        <strong>Network Access:</strong><br>
                        • Local: <strong>http://[YOUR-NAS-IP]:${PORT}</strong><br>
                        • External: <strong>http://[YOUR-PUBLIC-IP]:${PORT}</strong> (requires port forwarding)<br><br>
                        <a href="/app" style="display: inline-block; background: #667eea; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 500; margin-top: 0.5rem;">🚀 Launch App</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Simple status check
        fetch('/api/health')
            .then(response => response.json())
            .then(data => {
                console.log('✅ Server health check:', data);
            })
            .catch(error => {
                console.log('⚠️ Server health check failed:', error);
            });
    </script>
</body>
</html>
`;

const server = createServer((req, res) => {
  const { pathname } = parse(req.url, true);
  
  // Enable CORS for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
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

  // Serve the actual React Native Web app
  if (pathname === '/app') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(getReactNativeWebApp());
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