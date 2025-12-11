#!/bin/bash
# ============================================
# clean_pm2.sh — Clean up specific PM2 processes from ecosystem.config.js
# Safely stops only the services defined in this project
# ============================================

# Define the specific services from ecosystem.config.js
SERVICES=("poca-api" "poca-queue")

echo "🧹 Stopping project-specific PM2 processes..."

# Stop each service individually
for service in "${SERVICES[@]}"; do
  echo "  📦 Stopping $service..."
  pm2 stop "$service" >/dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "    ✅ $service stopped"
  else
    echo "    ⚠️  $service was not running"
  fi
done

echo "🗑️ Deleting project-specific PM2 processes..."

# Delete each service individually
for service in "${SERVICES[@]}"; do
  echo "  🗑️ Deleting $service..."
  pm2 delete "$service" >/dev/null 2>&1
  if [ $? -eq 0 ]; then
    echo "    ✅ $service deleted"
  else
    echo "    ⚠️  $service was not found"
  fi
done

echo "🔍 Checking for leftover project-specific Node.js processes..."
# Only check for processes that match our project patterns
PROJECT_PIDS=$(ps aux | grep -E "(poca-api|poca-queue)" | grep -v grep | awk '{print $2}')
if [ -n "$PROJECT_PIDS" ]; then
  echo "🚫 Killing leftover project processes: $PROJECT_PIDS"
  kill -9 $PROJECT_PIDS >/dev/null 2>&1
else
  echo "✅ No leftover project processes found."
fi

echo "🧼 Cleaning project-specific PM2 logs..."
# Only clean logs for our specific services
for service in "${SERVICES[@]}"; do
  rm -f ~/.pm2/logs/${service}*.log >/dev/null 2>&1
done

echo "📊 Current PM2 status:"
pm2 status

echo "✅ Done! Project-specific PM2 processes are now clean."
echo "ℹ️  Other PM2 processes (if any) were left untouched for safety."
