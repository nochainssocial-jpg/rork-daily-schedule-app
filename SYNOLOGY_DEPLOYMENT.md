# Deploy Daily Schedule App to Synology NAS DS214Play

## Prerequisites

Your Synology NAS DS214Play needs:
- SSH access enabled
- Internet connection for downloading dependencies

**Note:** Docker may not be available on DS214Play due to ARM architecture limitations. Use the Simple Installation method below if Docker is not available.

## Deployment Options

### Option 0: Simple Installation (Recommended for DS214Play)

**Use this method if Docker is not available on your NAS**

1. **Upload your app to NAS:**
   ```bash
   # On your local machine, create a tar of your project
   tar -czf daily-schedule-app.tar.gz .
   
   # Upload to NAS (replace YOUR_NAS_IP with actual IP)
   scp daily-schedule-app.tar.gz admin@YOUR_NAS_IP:/volume1/
   ```

2. **SSH into your NAS and install:**
   ```bash
   ssh admin@YOUR_NAS_IP
   cd /volume1
   tar -xzf daily-schedule-app.tar.gz
   cd daily-schedule-app
   
   # Make installer executable and run
   chmod +x install-nas-simple.sh
   sudo ./install-nas-simple.sh
   ```

3. **Start the application:**
   ```bash
   /volume1/web/daily-schedule-app/service.sh start
   ```

4. **Access your app:**
   - Open browser and go to: `http://YOUR_NAS_IP:8081`

**Management Commands:**
- Start: `/volume1/web/daily-schedule-app/service.sh start`
- Stop: `/volume1/web/daily-schedule-app/service.sh stop`
- Restart: `/volume1/web/daily-schedule-app/service.sh restart`
- Status: `/volume1/web/daily-schedule-app/service.sh status`
- View logs: `/volume1/web/daily-schedule-app/service.sh logs`

### Option 1: Docker Deployment (Recommended)

1. **Enable Docker on your NAS:**
   - Open Package Center on your Synology
   - Install "Docker" package
   - Open Docker and enable SSH if needed

2. **Upload your app to NAS:**
   ```bash
   # On your local machine, create a tar of your project
   tar -czf daily-schedule-app.tar.gz .
   
   # Upload to NAS (replace YOUR_NAS_IP with actual IP)
   scp daily-schedule-app.tar.gz admin@YOUR_NAS_IP:/volume1/docker/
   ```

3. **SSH into your NAS and deploy:**
   ```bash
   ssh admin@YOUR_NAS_IP
   cd /volume1/docker
   tar -xzf daily-schedule-app.tar.gz
   cd daily-schedule-app
   
   # Build and run with Docker Compose
   docker-compose up -d
   ```

4. **Access your app:**
   - Open browser and go to: `http://YOUR_NAS_IP:8081`

### Option 2: Direct Node.js Deployment

1. **Install Node.js on NAS:**
   - Install Node.js package from Synology Package Center
   - Or manually install via SSH

2. **Install Bun:**
   ```bash
   ssh admin@YOUR_NAS_IP
   curl -fsSL https://bun.sh/install | bash
   source ~/.bashrc
   ```

3. **Deploy app:**
   ```bash
   # Upload and extract your app
   cd /volume1/web
   # ... upload your files here ...
   
   # Install dependencies and start
   bun install
   chmod +x start-nas.sh
   ./start-nas.sh
   ```

### Option 3: Web Station (Static Build)

1. **Build static version:**
   ```bash
   # On your local machine
   bun run build-web
   ```

2. **Upload to Web Station:**
   - Enable Web Station in Package Center
   - Upload the built files to `/volume1/web/`
   - Access via `http://YOUR_NAS_IP/`

## Configuration

### Port Configuration
- Default port: 8081
- Make sure this port is open in your NAS firewall
- You can change the port in `docker-compose.yml` or startup scripts

### Network Access
- **Local Network:** `http://YOUR_NAS_IP:8081`
- **External Access:** Configure port forwarding on your router for port 8081

### Data Persistence
- App data is stored in `/app/data` inside the container
- Mapped to `./data` on your NAS for persistence

## Troubleshooting

### Common Issues:

1. **Port already in use:**
   ```bash
   # Check what's using port 8081
   netstat -tulpn | grep 8081
   # Change port in docker-compose.yml if needed
   ```

2. **Permission issues:**
   ```bash
   # Fix permissions
   sudo chown -R admin:users /volume1/docker/daily-schedule-app
   chmod +x start-nas.sh
   ```

3. **Docker not starting:**
   ```bash
   # Check Docker logs
   docker-compose logs daily-schedule-app
   ```

4. **Memory issues on DS214Play:**
   - The DS214Play has limited RAM
   - Consider using the static build option for better performance
   - Monitor resource usage in DSM

### Performance Optimization for DS214Play:

1. **Use static build when possible**
2. **Limit concurrent connections**
3. **Enable gzip compression**
4. **Use external database if needed**

## Maintenance

### Updates:
```bash
# Pull latest code
cd /volume1/docker/daily-schedule-app
git pull origin main  # if using git
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup:
```bash
# Backup app data
tar -czf backup-$(date +%Y%m%d).tar.gz /volume1/docker/daily-schedule-app/data
```

### Monitoring:
- Check logs: `docker-compose logs -f daily-schedule-app`
- Monitor resources in DSM Resource Monitor
- Set up notifications for container status

## Security Notes

- Change default ports if exposing to internet
- Use HTTPS with reverse proxy (nginx)
- Keep NAS and Docker updated
- Limit external access to necessary IPs only
- Regular backups of app data