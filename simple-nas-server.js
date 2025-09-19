const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

console.log('================================');
console.log('    Daily Schedule App Server    ');
console.log('         for Synology NAS       ');
console.log('     (Pure Node.js - No Deps)   ');
console.log('================================');
console.log('');

// Simple in-memory storage for schedules
let schedules = [];
let scheduleIdCounter = 1;

// Create the main HTML page
const createMainPage = () => {
  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const dayName = dayNames[today.getDay()];
  const monthName = monthNames[today.getMonth()];
  const dateString = `${today.getDate()} ${monthName} ${today.getFullYear()}`;
  
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
            background-color: #F5F5F5;
            min-height: 100vh;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            min-height: 100vh;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        
        .header {
            background: white;
            padding: 20px;
            border-bottom: 1px solid #e0e0e0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .header h1 {
            font-size: 27px;
            font-weight: bold;
            color: #333;
            margin: 0;
        }
        
        .logo {
            width: 45px;
            height: 45px;
            border-radius: 8px;
        }
        
        .date-section {
            background: white;
            padding: 15px 20px;
            text-align: center;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .day-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        
        .date-text {
            font-size: 17px;
            color: #666;
            font-weight: 600;
        }
        
        .actions {
            background: white;
            padding: 15px 20px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .action-buttons {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: center;
        }
        
        .btn {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            min-width: 120px;
        }
        
        .btn-primary {
            background: #007AFF;
            color: white;
        }
        
        .btn-primary:hover {
            background: #0056CC;
        }
        
        .btn-success {
            background: #34C759;
            color: white;
        }
        
        .btn-success:hover {
            background: #28A745;
        }
        
        .btn-warning {
            background: #FF9500;
            color: white;
        }
        
        .btn-warning:hover {
            background: #E6850E;
        }
        
        .btn-secondary {
            background: #8E8E93;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #6D6D70;
        }
        
        .status-section {
            padding: 20px;
        }
        
        .status-card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .status-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
        }
        
        .status-item {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .status-icon {
            margin-right: 10px;
            font-size: 18px;
        }
        
        .status-running {
            color: #34C759;
        }
        
        .info-card {
            background: #E3F2FD;
            border-left: 4px solid #2196F3;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .info-title {
            font-size: 18px;
            font-weight: bold;
            color: #1976D2;
            margin-bottom: 10px;
        }
        
        .info-text {
            color: #1976D2;
            line-height: 1.5;
        }
        
        .categories {
            padding: 0 20px 20px;
        }
        
        .category-item {
            background: white;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .category-item:hover {
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            transform: translateY(-1px);
        }
        
        .category-icon {
            width: 40px;
            height: 40px;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-size: 20px;
        }
        
        .category-title {
            flex: 1;
            font-size: 16px;
            color: #333;
            font-weight: 500;
        }
        
        .category-arrow {
            color: #999;
            font-size: 18px;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        
        .modal-content {
            background-color: white;
            margin: 5% auto;
            padding: 20px;
            border-radius: 12px;
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .close:hover {
            color: black;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #333;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }
        
        .form-group textarea {
            height: 80px;
            resize: vertical;
        }
        
        .schedule-list {
            margin-top: 20px;
        }
        
        .schedule-item {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #007AFF;
        }
        
        .schedule-item h4 {
            margin: 0 0 5px 0;
            color: #333;
        }
        
        .schedule-item p {
            margin: 0;
            color: #666;
            font-size: 14px;
        }
        
        @media (max-width: 600px) {
            .container {
                margin: 0;
                box-shadow: none;
            }
            
            .action-buttons {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
            }
            
            .modal-content {
                margin: 10% auto;
                width: 95%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Daily Schedule</h1>
            <img src="https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/sfl62jz9efty7wm6r3s5e" 
                 class="logo" alt="Logo" />
        </div>
        
        <div class="date-section">
            <div class="day-name">${dayName}</div>
            <div class="date-text">${dateString}</div>
        </div>
        
        <div class="actions">
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="openCreateModal()">Create Schedule</button>
                <button class="btn btn-success" onclick="openViewModal()">View Schedules</button>
                <button class="btn btn-warning" onclick="shareSchedule()">Share Schedule</button>
                <button class="btn btn-secondary" onclick="settings()">Settings</button>
            </div>
        </div>
        
        <div class="status-section">
            <div class="status-card">
                <div class="status-title">Status</div>
                <div class="status-item">
                    <span class="status-icon status-running">✅</span>
                    <span>Server Running</span>
                </div>
                <div class="status-item">
                    <span class="status-icon status-running">✅</span>
                    <span>Backend API: Available</span>
                </div>
                <div class="status-item">
                    <span class="status-icon status-running">🌐</span>
                    <span>Port: ${PORT}</span>
                </div>
            </div>
            
            <div class="info-card">
                <div class="info-title">🎉 Success!</div>
                <div class="info-text">
                    Your Daily Schedule App is now running on your Synology NAS!<br>
                    This is a fully functional version with schedule management.
                </div>
            </div>
        </div>
        
        <div class="categories">
            <div class="category-item" onclick="showFeature('staff')">
                <div class="category-icon" style="background: #4A90E220; color: #4A90E2;">👥</div>
                <div class="category-title">Staff working today</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('participants')">
                <div class="category-icon" style="background: #7B68EE20; color: #7B68EE;">✓</div>
                <div class="category-title">Participants attending today</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('assignments')">
                <div class="category-icon" style="background: #FF6B6B20; color: #FF6B6B;">📋</div>
                <div class="category-title">Daily Assignment</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('frontRoom')">
                <div class="category-icon" style="background: #4ECDC420; color: #4ECDC4;">🏠</div>
                <div class="category-title">Front Room</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('scotty')">
                <div class="category-icon" style="background: #95E77E20; color: #95E77E;">👶</div>
                <div class="category-title">Scotty</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('twins')">
                <div class="category-icon" style="background: #FFD93D20; color: #FFD93D;">👥</div>
                <div class="category-title">Twins</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('chores')">
                <div class="category-icon" style="background: #FF8C4220; color: #FF8C42;">☑️</div>
                <div class="category-title">Chores</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('dropoffs')">
                <div class="category-icon" style="background: #A8DADC20; color: #A8DADC;">🚗</div>
                <div class="category-title">Drop-offs & Pickups</div>
                <div class="category-arrow">→</div>
            </div>
            
            <div class="category-item" onclick="showFeature('checklist')">
                <div class="category-icon" style="background: #E56B6F20; color: #E56B6F;">📝</div>
                <div class="category-title">Final Checklist</div>
                <div class="category-arrow">→</div>
            </div>
        </div>
    </div>
    
    <!-- Create Schedule Modal -->
    <div id="createModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal('createModal')">&times;</span>
            <h2>Create New Schedule</h2>
            <form id="scheduleForm">
                <div class="form-group">
                    <label for="scheduleTitle">Schedule Title:</label>
                    <input type="text" id="scheduleTitle" name="title" required>
                </div>
                <div class="form-group">
                    <label for="scheduleDate">Date:</label>
                    <input type="date" id="scheduleDate" name="date" required>
                </div>
                <div class="form-group">
                    <label for="scheduleDescription">Description:</label>
                    <textarea id="scheduleDescription" name="description"></textarea>
                </div>
                <div class="form-group">
                    <label for="scheduleStaff">Staff Members:</label>
                    <textarea id="scheduleStaff" name="staff" placeholder="Enter staff names, one per line"></textarea>
                </div>
                <div class="form-group">
                    <label for="scheduleParticipants">Participants:</label>
                    <textarea id="scheduleParticipants" name="participants" placeholder="Enter participant names, one per line"></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Create Schedule</button>
            </form>
        </div>
    </div>
    
    <!-- View Schedules Modal -->
    <div id="viewModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="closeModal('viewModal')">&times;</span>
            <h2>All Schedules</h2>
            <div id="schedulesList" class="schedule-list">
                <!-- Schedules will be loaded here -->
            </div>
        </div>
    </div>
    
    <script>
        // Set today's date as default
        document.getElementById('scheduleDate').value = new Date().toISOString().split('T')[0];
        
        function openCreateModal() {
            document.getElementById('createModal').style.display = 'block';
        }
        
        function openViewModal() {
            document.getElementById('viewModal').style.display = 'block';
            loadSchedules();
        }
        
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }
        
        // Close modal when clicking outside
        window.onclick = function(event) {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                if (event.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }
        
        // Handle form submission
        document.getElementById('scheduleForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const scheduleData = {
                title: formData.get('title'),
                date: formData.get('date'),
                description: formData.get('description'),
                staff: formData.get('staff').split('\n').filter(s => s.trim()),
                participants: formData.get('participants').split('\n').filter(s => s.trim())
            };
            
            try {
                const response = await fetch('/api/schedules', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(scheduleData)
                });
                
                if (response.ok) {
                    alert('Schedule created successfully!');
                    closeModal('createModal');
                    e.target.reset();
                    document.getElementById('scheduleDate').value = new Date().toISOString().split('T')[0];
                } else {
                    alert('Error creating schedule');
                }
            } catch (error) {
                alert('Error creating schedule: ' + error.message);
            }
        });
        
        async function loadSchedules() {
            try {
                const response = await fetch('/api/schedules');
                const schedules = await response.json();
                
                const schedulesList = document.getElementById('schedulesList');
                
                if (schedules.length === 0) {
                    schedulesList.innerHTML = '<p>No schedules created yet.</p>';
                    return;
                }
                
                schedulesList.innerHTML = schedules.map(schedule => `
                    <div class="schedule-item">
                        <h4>${schedule.title}</h4>
                        <p><strong>Date:</strong> ${new Date(schedule.date).toLocaleDateString()}</p>
                        <p><strong>Description:</strong> ${schedule.description || 'No description'}</p>
                        <p><strong>Staff:</strong> ${schedule.staff.join(', ') || 'None specified'}</p>
                        <p><strong>Participants:</strong> ${schedule.participants.join(', ') || 'None specified'}</p>
                        <p><strong>Created:</strong> ${new Date(schedule.createdAt).toLocaleString()}</p>
                    </div>
                `).join('');
            } catch (error) {
                document.getElementById('schedulesList').innerHTML = '<p>Error loading schedules: ' + error.message + '</p>';
            }
        }
        
        function shareSchedule() {
            alert('Share functionality: You can copy the URL and share it with your team members to access the schedules.');
        }
        
        function settings() {
            alert('Settings: This is where you would configure app preferences, user management, etc.');
        }
        
        function showFeature(category) {
            alert('Category "' + category + '" management will be added in future updates.');
        }
    </script>
</body>
</html>`;
};

// Simple HTTP server
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Routes
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(createMainPage());
  }
  else if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'running',
      message: 'Daily Schedule App Backend is running',
      timestamp: new Date().toISOString(),
      port: PORT,
      backend: true,
      schedules: schedules.length
    }));
  }
  else if (pathname === '/api/schedules' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(schedules));
  }
  else if (pathname === '/api/schedules' && method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const scheduleData = JSON.parse(body);
        const newSchedule = {
          id: scheduleIdCounter++,
          ...scheduleData,
          createdAt: new Date().toISOString()
        };
        schedules.push(newSchedule);
        
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(newSchedule));
      } catch (error) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
  }
  else {
    // Serve the main page for any other route (SPA behavior)
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(createMainPage());
  }
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('✅ Daily Schedule App started successfully!');
  console.log(`📍 Server running at: http://${HOST}:${PORT}`);
  console.log(`🌐 Local access: http://localhost:${PORT}`);
  console.log(`📱 Mobile access: http://[YOUR-NAS-IP]:${PORT}`);
  console.log('');
  console.log('💡 Tips:');
  console.log('   • Replace [YOUR-NAS-IP] with your actual NAS IP address');
  console.log('   • Make sure port 3000 is open in your NAS firewall');
  console.log('   • Press Ctrl+C to stop the server');
  console.log('');
  console.log('🔧 Backend API: Available (Pure Node.js)');
  console.log('✨ Features: Create & View Schedules');
  console.log('================================');
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