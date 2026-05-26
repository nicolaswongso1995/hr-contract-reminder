#!/bin/bash
# ============================================================
# HR Weekly Contract Expiry Report — Runner Script
# Scheduled: every Monday 08:00 WIB (01:00 UTC)
#
# To install as a cron job, run:
#   crontab -e
# Then add this line:
#   0 1 * * 1 /bin/bash "/Users/mac/Documents/CLAUDE CODE AI/hr-contract-reminder/run_weekly.sh" >> /tmp/hr_weekly.log 2>&1
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/tmp/hr_weekly.log"

echo "────────────────────────────────────────" >> "$LOG_FILE"
echo "Run started: $(date '+%Y-%m-%d %H:%M:%S %Z')" >> "$LOG_FILE"

/usr/bin/python3 "$SCRIPT_DIR/hris/weekly_report.py" >> "$LOG_FILE" 2>&1

echo "Run finished: $(date '+%Y-%m-%d %H:%M:%S %Z')" >> "$LOG_FILE"
