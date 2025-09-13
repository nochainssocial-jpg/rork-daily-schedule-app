#!/bin/bash

# Daily Schedule App - Synology NAS Installer
# Compatible with DS214Play and other Synology models

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="daily-schedule-app"
APP_PORT="8081"
INSTALL_DIR="/volume1/docker/${APP_NAME}"
DATA_DIR="${INSTALL_DIR}/data"
BACKUP_DIR="/volume1/docker/backups/${APP_NAME}"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Daily Schedule App Installer  ${NC}"
    echo -e "${BLUE}     for Synology NAS DS214Play ${NC}"
    echo -e "${BLUE}================================${NC}"
    echo
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    print_step "Checking system requirements..."
    
    # Check if running as root or admin
    if [[ $EUID -ne 0 ]] && [[ $(whoami) != "admin" ]]; then
        print_error "This script must be run as root or admin user"
        exit 1
    fi
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker from Package Center first."
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! command -v docker-compose &> /dev/null; then
        print_warning "docker-compose not found, trying to install..."
        # Try to install docker-compose
        curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        
        if ! command -v docker-compose &> /dev/null; then
            print_error "Failed to install docker-compose"
            exit 1
        fi
    fi
    
    print_info "✓ All requirements met"
}

check_port() {
    print_step "Checking if port ${APP_PORT} is available..."
    
    if netstat -tuln | grep -q ":${APP_PORT} "; then
        print_warning "Port ${APP_PORT} is already in use"
        read -p "Enter a different port number (default: 8082): " new_port
        APP_PORT=${new_port:-8082}
        print_info "Using port ${APP_PORT}"
    else
        print_info "✓ Port ${APP_PORT} is available"
    fi
}

create_directories() {
    print_step "Creating installation directories..."
    
    # Create main installation directory
    mkdir -p "${INSTALL_DIR}"
    mkdir -p "${DATA_DIR}"
    mkdir -p "${BACKUP_DIR}"
    
    # Set proper permissions
    chown -R admin:users "${INSTALL_DIR}"
    chmod -R 755 "${INSTALL_DIR}"
    
    print_info "✓ Directories created at ${INSTALL_DIR}"
}

backup_existing() {
    if [ -d "${INSTALL_DIR}" ] && [ "$(ls -A ${INSTALL_DIR})" ]; then
        print_step "Backing up existing installation..."
        
        backup_name="backup-$(date +%Y%m%d-%H%M%S).tar.gz"
        tar -czf "${BACKUP_DIR}/${backup_name}" -C "${INSTALL_DIR}" .
        
        print_info "✓ Backup created: ${BACKUP_DIR}/${backup_name}"
    fi
}

install_app() {
    print_step "Installing Daily Schedule App..."
    
    # Copy all files to installation directory
    cp -r . "${INSTALL_DIR}/"
    
    # Update docker-compose.yml with custom port
    sed -i "s/8081:8081/${APP_PORT}:8081/g" "${INSTALL_DIR}/docker-compose.yml"
    
    # Make scripts executable
    chmod +x "${INSTALL_DIR}"/*.sh
    
    print_info "✓ App files installed"
}

build_and_start() {
    print_step "Building and starting the application..."
    
    cd "${INSTALL_DIR}"
    
    # Stop any existing containers
    docker-compose down 2>/dev/null || true
    
    # Build and start
    docker-compose up -d --build
    
    # Wait for container to be ready
    print_info "Waiting for application to start..."
    sleep 10
    
    # Check if container is running
    if docker-compose ps | grep -q "Up"; then
        print_info "✓ Application started successfully"
    else
        print_error "Failed to start application. Check logs with: docker-compose logs"
        exit 1
    fi
}

create_management_scripts() {
    print_step "Creating management scripts..."
    
    # Create start script
    cat > "${INSTALL_DIR}/start.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker-compose up -d
echo "Daily Schedule App started"
EOF

    # Create stop script
    cat > "${INSTALL_DIR}/stop.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker-compose down
echo "Daily Schedule App stopped"
EOF

    # Create restart script
    cat > "${INSTALL_DIR}/restart.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
docker-compose down
docker-compose up -d
echo "Daily Schedule App restarted"
EOF

    # Create update script
    cat > "${INSTALL_DIR}/update.sh" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
echo "Stopping application..."
docker-compose down
echo "Pulling latest changes..."
# Add your update logic here (git pull, etc.)
echo "Rebuilding and starting..."
docker-compose up -d --build
echo "Update complete"
EOF

    # Create backup script
    cat > "${INSTALL_DIR}/backup.sh" << EOF
#!/bin/bash
cd "\$(dirname "\$0")"
BACKUP_NAME="backup-\$(date +%Y%m%d-%H%M%S).tar.gz"
tar -czf "${BACKUP_DIR}/\${BACKUP_NAME}" data/
echo "Backup created: ${BACKUP_DIR}/\${BACKUP_NAME}"
EOF

    # Make all scripts executable
    chmod +x "${INSTALL_DIR}"/*.sh
    
    print_info "✓ Management scripts created"
}

setup_autostart() {
    print_step "Setting up auto-start on boot..."
    
    # Create systemd service file (if systemd is available)
    if command -v systemctl &> /dev/null; then
        cat > "/etc/systemd/system/${APP_NAME}.service" << EOF
[Unit]
Description=Daily Schedule App
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

        systemctl enable "${APP_NAME}.service"
        print_info "✓ Auto-start configured with systemd"
    else
        # Fallback: add to crontab
        (crontab -l 2>/dev/null; echo "@reboot cd ${INSTALL_DIR} && docker-compose up -d") | crontab -
        print_info "✓ Auto-start configured with crontab"
    fi
}

show_completion_info() {
    print_step "Installation completed successfully!"
    echo
    print_info "Application Details:"
    echo "  • Installation Directory: ${INSTALL_DIR}"
    echo "  • Data Directory: ${DATA_DIR}"
    echo "  • Port: ${APP_PORT}"
    echo
    print_info "Access URLs:"
    echo "  • Local Network: http://$(hostname -I | awk '{print $1}'):${APP_PORT}"
    echo "  • Localhost: http://localhost:${APP_PORT}"
    echo
    print_info "Management Commands:"
    echo "  • Start:   ${INSTALL_DIR}/start.sh"
    echo "  • Stop:    ${INSTALL_DIR}/stop.sh"
    echo "  • Restart: ${INSTALL_DIR}/restart.sh"
    echo "  • Update:  ${INSTALL_DIR}/update.sh"
    echo "  • Backup:  ${INSTALL_DIR}/backup.sh"
    echo
    print_info "Docker Commands:"
    echo "  • View logs: cd ${INSTALL_DIR} && docker-compose logs -f"
    echo "  • Check status: cd ${INSTALL_DIR} && docker-compose ps"
    echo
    print_warning "Note: If accessing from outside your network, configure port forwarding for port ${APP_PORT}"
}

# Main installation process
main() {
    print_header
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "docker-compose.yml" ]; then
        print_error "This script must be run from the Daily Schedule App directory"
        print_info "Make sure you have extracted the app files and are running this script from that directory"
        exit 1
    fi
    
    check_requirements
    check_port
    backup_existing
    create_directories
    install_app
    build_and_start
    create_management_scripts
    setup_autostart
    show_completion_info
    
    echo
    print_info "Installation complete! Your Daily Schedule App is now running."
    print_info "You can access it at: http://$(hostname -I | awk '{print $1}'):${APP_PORT}"
}

# Run main function
main "$@"