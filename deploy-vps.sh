#!/bin/bash

# Deployment script for VPS
# Run this on your VPS: bash deploy-vps.sh

set -e  # Exit on error

echo "========================================"
echo "Chenaniah Backend Deployment"
echo "========================================"
echo ""

# Change to correct directory
cd /home/barch/projects/chenaniah/backend
echo "✓ Changed to backend directory"

# Pull latest changes from dev branch
echo "Pulling latest changes..."
git pull origin dev

# Install dependencies (including dev dependencies for build)
echo "Installing dependencies..."
npm install

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Run migrations
echo "Running database migrations..."
export DATABASE_URL="postgresql://chenaniah:30433043@localhost:5432/chenaniah_db"
npx prisma migrate deploy

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Check if dist/server.js exists
if [ ! -f "dist/server.js" ]; then
    echo "❌ Build failed - dist/server.js not found"
    exit 1
fi

echo "✓ Build successful"

# Stop old PM2 process if exists
echo "Stopping old PM2 process..."
pm2 delete chenaniah-api-v2 2>/dev/null || true

# Start with PM2
echo "Starting with PM2..."
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save

echo ""
echo "========================================"
echo "✓ Deployment Complete!"
echo "========================================"
echo ""
echo "Check status: pm2 status"
echo "View logs: pm2 logs chenaniah-api-v2"
echo "Test API: curl http://localhost:5001/health"
echo ""
echo "Next step: Configure Nginx reverse proxy"

