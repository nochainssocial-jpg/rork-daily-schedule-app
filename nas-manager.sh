#!/bin/bash

# Synology NAS Management Script for Daily Schedule App

APP_NAME="daily-schedule-app"
APP_DIR="/volume1/docker/$APP_NAME"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

case "$1" in
    start)
        echo "Starting $APP_NAME..."
        cd $APP_DIR
        docker-compose up -d
        echo "$APP_NAME started. Access at http://$(hostname -I | awk '{print $1}'):8081"
        ;;
    stop)
        echo "Stopping $APP_NAME..."
        cd $APP_DIR
        docker-compose down
        echo "$APP_NAME stopped."
        ;;
    restart)
        echo "Restarting $APP_NAME..."
        cd $APP_DIR
        docker-compose down
        docker-compose up -d
        echo "$APP_NAME restarted."
        ;;
    update)
        echo "Updating $APP_NAME..."
        cd $APP_DIR
        docker-compose down
        docker-compose build --no-cache
        docker-compose up -d
        echo "$APP_NAME updated and restarted."
        ;;
    logs)
        echo "Showing logs for $APP_NAME..."
        cd $APP_DIR
        docker-compose logs -f
        ;;
    status)
        echo "Status of $APP_NAME:"
        cd $APP_DIR
        docker-compose ps
        ;;
    backup)
        BACKUP_DIR="/volume1/backups"
        BACKUP_FILE="$BACKUP_DIR/${APP_NAME}-backup-$(date +%Y%m%d-%H%M%S).tar.gz"
        echo "Creating backup..."
        mkdir -p $BACKUP_DIR
        tar -czf $BACKUP_FILE -C $APP_DIR .
        echo "Backup created: $BACKUP_FILE"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|update|logs|status|backup}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the application"
        echo "  stop    - Stop the application"
        echo "  restart - Restart the application"
        echo "  update  - Rebuild and restart the application"
        echo "  logs    - Show application logs"
        echo "  status  - Show application status"
        echo "  backup  - Create a backup of the application"
        exit 1
        ;;
esac