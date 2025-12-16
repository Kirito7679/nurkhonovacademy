#!/bin/bash

# Script to setup automatic backups using cron
# This script should be run as root or with sudo

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.ts"

# Check if node and tsx are available
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

if ! command -v tsx &> /dev/null; then
    echo "Error: tsx is not installed. Run: npm install -g tsx"
    exit 1
fi

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "Warning: pg_dump is not installed. PostgreSQL backups will not work."
    echo "Install PostgreSQL client tools to enable backups."
fi

# Create cron job for daily backup at 2:00 AM
CRON_JOB="0 2 * * * cd $BACKEND_DIR && /usr/bin/tsx $BACKUP_SCRIPT >> /var/log/nurkhonov-backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "Cron job already exists. Removing old entry..."
    crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✅ Automatic backup cron job installed successfully!"
echo "   Backup will run daily at 2:00 AM"
echo "   Logs will be written to: /var/log/nurkhonov-backup.log"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove this cron job: crontab -e (then delete the line)"
