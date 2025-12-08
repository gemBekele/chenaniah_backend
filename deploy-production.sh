#!/bin/bash

# Production Deployment Script for Chenaniah VPS
# This script updates both frontend and backend on the VPS
# Run this on your VPS: bash deploy-production.sh

set -e  # Exit on error

echo "========================================"
echo "Chenaniah Production Deployment"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

# ============================================
# BACKEND DEPLOYMENT
# ============================================
echo "========================================"
echo "1. Deploying Backend..."
echo "========================================"
echo ""

cd /home/barch/projects/chenaniah/backend

# Pull latest changes
echo "Pulling latest changes from dev branch..."
git checkout dev
git pull origin dev
print_status "Backend code updated"

# Install dependencies
echo "Installing dependencies..."
npm install
print_status "Dependencies installed"

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate
print_status "Prisma client generated"

# Run migrations
echo "Running database migrations..."
export DATABASE_URL="postgresql://chenaniah:30433043@localhost:5432/chenaniah_db"
npx prisma migrate deploy
print_status "Database migrations applied"

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Check if build succeeded
if [ ! -f "dist/server.js" ]; then
    print_error "Build failed - dist/server.js not found"
    exit 1
fi
print_status "Backend build successful"

# Restart PM2 process
echo "Restarting backend with PM2..."
pm2 restart chenaniah-api-v2 || pm2 start ecosystem.config.js
pm2 save
print_status "Backend restarted"

# ============================================
# FRONTEND DEPLOYMENT
# ============================================
echo ""
echo "========================================"
echo "2. Deploying Frontend..."
echo "========================================"
echo ""

cd /home/barch/projects/chenaniah/web/chenaniah-web

# Pull latest changes
echo "Pulling latest changes from dev branch..."
git checkout dev
git pull origin dev
print_status "Frontend code updated"

# Install dependencies
echo "Installing dependencies..."
npm install
print_status "Dependencies installed"

# Build the frontend
echo "Building frontend..."
npm run build

# Check if build succeeded
if [ ! -d ".next" ]; then
    print_error "Build failed - .next directory not found"
    exit 1
fi
print_status "Frontend build successful"

# Restart PM2 process
echo "Restarting frontend with PM2..."
pm2 restart chenaniah-web || pm2 start npm --name "chenaniah-web" -- start
pm2 save
print_status "Frontend restarted"

# ============================================
# VERIFICATION
# ============================================
echo ""
echo "========================================"
echo "3. Verifying Deployment..."
echo "========================================"
echo ""

# Check PM2 status
echo "PM2 Status:"
pm2 status

echo ""
echo "Testing backend health..."
BACKEND_HEALTH=$(curl -s http://localhost:5001/api/health || echo "failed")
if [[ $BACKEND_HEALTH == *"healthy"* ]]; then
    print_status "Backend health check passed"
else
    print_warning "Backend health check failed - check logs: pm2 logs chenaniah-api-v2"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "Backend API: https://chenaniah.org/api/v2"
echo "Frontend: https://chenaniah.org"
echo ""
echo "Useful commands:"
echo "  - Check PM2 status: pm2 status"
echo "  - View backend logs: pm2 logs chenaniah-api-v2"
echo "  - View frontend logs: pm2 logs chenaniah-web"
echo "  - Restart backend: pm2 restart chenaniah-api-v2"
echo "  - Restart frontend: pm2 restart chenaniah-web"
echo ""



