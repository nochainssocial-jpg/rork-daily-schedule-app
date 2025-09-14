#!/bin/bash

# Simple NAS Installation Script (No Docker Required)
# Compatible with DS214Play and other ARM-based Synology models

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
INSTALL_DIR="/volume1/web/${APP_NAME}"
DATA_DIR="${INSTALL_DIR}/data"
NODE_VERSION="18.17.0"

# Functions
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Daily Schedule App Installer  ${NC}"
    echo -e "${BLUE}   Simple Mode (No Docker)      ${NC}"
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

check_architecture() {
    print_step "Checking system architecture..."
    ARCH=$(uname -m)
    print_info "Architecture: $ARCH"
    
    case $ARCH in
        armv7l|armv6l)
            print_info "✓ ARM architecture detected - compatible with DS214Play"
            ;;
        x86_64|amd64)
            print_info "✓ x64 architecture detected"
            ;;
        *)
            print_warning "Unknown architecture: $ARCH"
            ;;
    esac
}

install_node() {
    print_step "Checking Node.js installation..."
    
    if command -v node &> /dev/null; then
        NODE_VER=$(node --version | cut -d'v' -f2)
        print_info "Node.js $NODE_VER is already installed"
        
        # Check if version is sufficient (18+)
        if [[ "$(printf '%s\n' "18.0.0" "$NODE_VER" | sort -V | head -n1)" == "18.0.0" ]]; then
            print_info "✓ Node.js version is sufficient"
            return 0
        else
            print_warning "Node.js version is too old, installing newer version..."
        fi
    fi
    
    print_step "Installing Node.js..."
    
    # Create temp directory
    TEMP_DIR="/tmp/node-install"
    mkdir -p $TEMP_DIR
    cd $TEMP_DIR
    
    # Determine download URL based on architecture
    case $(uname -m) in
        armv7l)
            NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-armv7l.tar.xz"
            ;;
        armv6l)
            NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-armv6l.tar.xz"
            ;;
        x86_64)
            NODE_URL="https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
            ;;
        *)
            print_error "Unsupported architecture for Node.js installation"
            exit 1
            ;;
    esac
    
    print_info "Downloading Node.js from: $NODE_URL"
    wget -O node.tar.xz "$NODE_URL"
    
    # Extract and install
    tar -xf node.tar.xz
    NODE_DIR=$(ls -d node-v${NODE_VERSION}-*)
    
    # Install to /usr/local
    sudo cp -r $NODE_DIR/* /usr/local/
    
    # Clean up
    cd /
    rm -rf $TEMP_DIR
    
    # Verify installation
    if command -v node &> /dev/null; then
        print_info "✓ Node.js $(node --version) installed successfully"
    else
        print_error "Failed to install Node.js"
        exit 1
    fi
}

install_bun() {
    print_step "Installing Bun runtime..."
    
    if command -v bun &> /dev/null; then
        print_info "✓ Bun is already installed"
        return 0
    fi
    
    # Install Bun
    curl -fsSL https://bun.sh/install | bash
    
    # Add to PATH
    export PATH="$HOME/.bun/bin:$PATH"
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
    
    # Verify installation
    if command -v bun &> /dev/null; then
        print_info "✓ Bun $(bun --version) installed successfully"
    else
        print_error "Failed to install Bun"
        exit 1
    fi
}

setup_directories() {
    print_step "Setting up directories..."
    
    # Create installation directory
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$DATA_DIR"
    
    # Set permissions
    chown -R admin:users "$INSTALL_DIR"
    chmod -R 755 "$INSTALL_DIR"
    
    print_info "✓ Directories created at $INSTALL_DIR"
}

install_app() {
    print_step "Installing application files..."
    
    # Copy application files
    cp -r . "$INSTALL_DIR/"
    
    # Install dependencies
    cd "$INSTALL_DIR"
    
    print_info "Installing dependencies..."
    bun install
    
    print_info "✓ Application installed"
}

create_startup_script() {
    print_step "Creating startup script..."
    
    cat > "$INSTALL_DIR/start-simple.sh" << EOF
#!/bin/bash

# Daily Schedule App Startup Script (Simple Mode)

APP_DIR="$INSTALL_DIR"
PORT="$APP_PORT"

cd "\$APP_DIR"

# Set environment variables
export NODE_ENV=production
export PORT=\$PORT
export PATH="\$HOME/.bun/bin:\$PATH"

echo "Starting Daily Schedule App on port \$PORT..."
echo "Access at: http://\$(hostname -I | awk '{print \$1}'):\$PORT"

# Start the application
bun run start
EOF

    chmod +x "$INSTALL_DIR/start-simple.sh"
    
    print_info "✓ Startup script created"
}

create_service_script() {
    print_step "Creating service management script..."
    
    cat > "$INSTALL_DIR/service.sh" << 'EOF'
#!/bin/bash

# Service management script

APP_DIR="$(dirname "$0")"
PID_FILE="$APP_DIR/app.pid"
LOG_FILE="$APP_DIR/app.log"

case "$1" in
    start)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "Application is already running (PID: $(cat $PID_FILE))"
            exit 1
        fi
        
        echo "Starting Daily Schedule App..."
        cd "$APP_DIR"
        nohup ./start-simple.sh > "$LOG_FILE" 2>&1 &
        echo $! > "$PID_FILE"
        echo "Application started (PID: $!)"
        ;;
    stop)
        if [ -f "$PID_FILE" ]; then
            PID=$(cat "$PID_FILE")
            if kill -0 $PID 2>/dev/null; then
                echo "Stopping Daily Schedule App (PID: $PID)..."
                kill $PID
                rm -f "$PID_FILE"
                echo "Application stopped"
            else
                echo "Application is not running"
                rm -f "$PID_FILE"
            fi
        else
            echo "Application is not running (no PID file)"
        fi
        ;;
    restart)
        $0 stop
        sleep 2
        $0 start
        ;;
    status)
        if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
            echo "Application is running (PID: $(cat $PID_FILE))"
        else
            echo "Application is not running"
        fi
        ;;
    logs)
        if [ -f "$LOG_FILE" ]; then
            tail -f "$LOG_FILE"
        else
            echo "No log file found"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        exit 1
        ;;
esac
EOF

    chmod +x "$INSTALL_DIR/service.sh"
    
    print_info "✓ Service script created"
}

setup_autostart() {
    print_step "Setting up auto-start..."
    
    # Add to crontab for auto-start on reboot
    (crontab -l 2>/dev/null | grep -v "$APP_NAME"; echo "@reboot $INSTALL_DIR/service.sh start") | crontab -
    
    print_info "✓ Auto-start configured"
}

show_completion() {
    print_step "Installation completed!"
    echo
    print_info "Application Details:"
    echo "  • Installation Directory: $INSTALL_DIR"
    echo "  • Data Directory: $DATA_DIR"
    echo "  • Port: $APP_PORT"
    echo
    print_info "Access URLs:"
    echo "  • Local Network: http://$(hostname -I | awk '{print $1}'):$APP_PORT"
    echo "  • Localhost: http://localhost:$APP_PORT"
    echo
    print_info "Management Commands:"
    echo "  • Start:   $INSTALL_DIR/service.sh start"
    echo "  • Stop:    $INSTALL_DIR/service.sh stop"
    echo "  • Restart: $INSTALL_DIR/service.sh restart"
    echo "  • Status:  $INSTALL_DIR/service.sh status"
    echo "  • Logs:    $INSTALL_DIR/service.sh logs"
    echo
    print_warning "To start the application now, run:"
    echo "  $INSTALL_DIR/service.sh start"
}

# Main installation process
main() {
    print_header
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "This script must be run from the Daily Schedule App directory"
        exit 1
    fi
    
    check_architecture
    install_node
    install_bun
    setup_directories
    install_app
    create_startup_script
    create_service_script
    setup_autostart
    show_completion
}

# Run main function
main "$@"