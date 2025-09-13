#!/bin/bash

# Create installation package for Synology NAS

set -e

# Configuration
PACKAGE_NAME="daily-schedule-app-nas-installer"
VERSION="1.0.0"
OUTPUT_DIR="./dist"
PACKAGE_DIR="${OUTPUT_DIR}/${PACKAGE_NAME}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_step "Creating NAS installation package..."

# Clean and create output directory
rm -rf "${OUTPUT_DIR}"
mkdir -p "${PACKAGE_DIR}"

# Copy essential files
print_step "Copying application files..."
cp -r app/ "${PACKAGE_DIR}/"
cp -r assets/ "${PACKAGE_DIR}/"
cp -r backend/ "${PACKAGE_DIR}/"
cp -r components/ "${PACKAGE_DIR}/"
cp -r constants/ "${PACKAGE_DIR}/"
cp -r hooks/ "${PACKAGE_DIR}/"
cp -r lib/ "${PACKAGE_DIR}/"
cp -r types/ "${PACKAGE_DIR}/"

# Copy configuration files
cp package.json "${PACKAGE_DIR}/"
cp bun.lock "${PACKAGE_DIR}/"
cp tsconfig.json "${PACKAGE_DIR}/"
cp app.json "${PACKAGE_DIR}/"
cp eslint.config.js "${PACKAGE_DIR}/"
cp Dockerfile "${PACKAGE_DIR}/"
cp docker-compose.yml "${PACKAGE_DIR}/"
cp .dockerignore "${PACKAGE_DIR}/"
cp .env.production "${PACKAGE_DIR}/"

# Copy installation and management scripts
cp install-nas.sh "${PACKAGE_DIR}/"
cp start-nas.sh "${PACKAGE_DIR}/"
cp nas-manager.sh "${PACKAGE_DIR}/"
cp SYNOLOGY_DEPLOYMENT.md "${PACKAGE_DIR}/"

# Create README for the package
cat > "${PACKAGE_DIR}/README.md" << 'EOF'
# Daily Schedule App - NAS Installation Package

This package contains everything needed to install and run the Daily Schedule App on your Synology NAS.

## Quick Installation

1. **Extract this package** to your NAS (via File Station or SSH)
2. **SSH into your NAS** as admin user
3. **Navigate to the extracted folder**
4. **Run the installer**:
   ```bash
   chmod +x install-nas.sh
   sudo ./install-nas.sh
   ```

## What's Included

- Complete Daily Schedule App source code
- Docker configuration for easy deployment
- Automated installation script
- Management scripts (start, stop, restart, backup)
- Comprehensive documentation

## System Requirements

- Synology NAS with Docker support
- At least 512MB available RAM
- Docker package installed from Package Center
- SSH access enabled

## Installation Methods

### Method 1: Automated Installation (Recommended)
```bash
# Make installer executable and run
chmod +x install-nas.sh
sudo ./install-nas.sh
```

### Method 2: Manual Docker Installation
```bash
# Build and run with Docker Compose
docker-compose up -d --build
```

### Method 3: Direct Node.js Installation
```bash
# Install dependencies and run
bun install
chmod +x start-nas.sh
./start-nas.sh
```

## Post-Installation

After installation, your app will be available at:
- **Local Network**: `http://YOUR_NAS_IP:8081`
- **External Access**: Configure port forwarding for port 8081

## Management

- **Start**: `./start.sh`
- **Stop**: `./stop.sh`
- **Restart**: `./restart.sh`
- **Backup**: `./backup.sh`
- **Update**: `./update.sh`

## Support

For detailed installation instructions, see `SYNOLOGY_DEPLOYMENT.md`

## Version

Package Version: 1.0.0
App Version: 1.0.0
Compatible with: Synology DS214Play and other Docker-capable NAS models
EOF

# Create installation verification script
cat > "${PACKAGE_DIR}/verify-installation.sh" << 'EOF'
#!/bin/bash

# Verify installation requirements

echo "=== Daily Schedule App - Installation Verification ==="
echo

# Check Docker
if command -v docker &> /dev/null; then
    echo "✓ Docker is installed"
    docker --version
else
    echo "✗ Docker is NOT installed"
    echo "  Please install Docker from Synology Package Center"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    echo "✓ Docker Compose is available"
    docker-compose --version
else
    echo "✗ Docker Compose is NOT available"
    echo "  The installer will attempt to install it automatically"
fi

# Check available ports
echo
echo "Checking port availability:"
if netstat -tuln 2>/dev/null | grep -q ":8081 "; then
    echo "✗ Port 8081 is already in use"
    echo "  The installer will prompt for an alternative port"
else
    echo "✓ Port 8081 is available"
fi

# Check disk space
echo
echo "Disk space check:"
df -h /volume1 2>/dev/null || df -h /

# Check memory
echo
echo "Memory check:"
free -h 2>/dev/null || echo "Memory info not available"

echo
echo "=== Verification Complete ==="
echo "If all checks pass, you can proceed with installation."
EOF

chmod +x "${PACKAGE_DIR}/verify-installation.sh"

# Create quick start script
cat > "${PACKAGE_DIR}/quick-start.sh" << 'EOF'
#!/bin/bash

# Quick start script for Daily Schedule App

echo "=== Daily Schedule App - Quick Start ==="
echo

# Check if we're in the right directory
if [ ! -f "install-nas.sh" ]; then
    echo "Error: This script must be run from the app directory"
    exit 1
fi

# Make scripts executable
chmod +x *.sh

echo "1. Running installation verification..."
./verify-installation.sh

echo
read -p "Do you want to proceed with installation? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "2. Starting installation..."
    sudo ./install-nas.sh
else
    echo "Installation cancelled."
    echo "You can run './install-nas.sh' manually when ready."
fi
EOF

chmod +x "${PACKAGE_DIR}/quick-start.sh"

# Create version info file
cat > "${PACKAGE_DIR}/VERSION" << EOF
Daily Schedule App NAS Package
Version: ${VERSION}
Build Date: $(date)
Compatible with: Synology NAS with Docker support
Minimum Requirements: 512MB RAM, Docker package
EOF

# Make all shell scripts executable
find "${PACKAGE_DIR}" -name "*.sh" -exec chmod +x {} \;

# Create the final package archive
print_step "Creating installation archive..."
cd "${OUTPUT_DIR}"
tar -czf "${PACKAGE_NAME}-v${VERSION}.tar.gz" "${PACKAGE_NAME}"/
zip -r "${PACKAGE_NAME}-v${VERSION}.zip" "${PACKAGE_NAME}"/

# Create checksums
sha256sum "${PACKAGE_NAME}-v${VERSION}.tar.gz" > "${PACKAGE_NAME}-v${VERSION}.tar.gz.sha256"
sha256sum "${PACKAGE_NAME}-v${VERSION}.zip" > "${PACKAGE_NAME}-v${VERSION}.zip.sha256"

print_step "Package creation completed!"
echo
print_info "Created packages:"
echo "  • ${OUTPUT_DIR}/${PACKAGE_NAME}-v${VERSION}.tar.gz"
echo "  • ${OUTPUT_DIR}/${PACKAGE_NAME}-v${VERSION}.zip"
echo
print_info "Installation Instructions:"
echo "1. Download and extract one of the packages above to your NAS"
echo "2. SSH into your NAS as admin user"
echo "3. Navigate to the extracted folder"
echo "4. Run: chmod +x quick-start.sh && ./quick-start.sh"
echo
print_info "Package contents:"
echo "  • Complete app source code"
echo "  • Automated installer (install-nas.sh)"
echo "  • Quick start script (quick-start.sh)"
echo "  • Installation verification (verify-installation.sh)"
echo "  • Management scripts"
echo "  • Documentation"
echo
print_info "The package is ready for deployment to your Synology NAS!"