# Backend Deployment Guide - chenaniah.org/api/v2

This guide explains how to deploy the Node.js backend to your VPS and make it accessible at `https://chenaniah.org/api/v2`.

## Prerequisites

- VPS with Ubuntu 22.04 (or similar)
- Domain: chenaniah.org
- PostgreSQL database configured
- Node.js 18+ installed
- PM2 for process management
- Nginx as reverse proxy

## Step 1: Install Dependencies on VPS

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx (if not already installed)
sudo apt install -y nginx

# Verify installations
node --version
npm --version
pm2 --version
nginx -v
```

## Step 2: Clone and Setup Backend

```bash
# Navigate to your projects directory
cd /home/barch/projects/chenaniah

# Switch to dev branch
cd backend
git checkout dev
git pull origin dev

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate
```

## Step 3: Configure Environment Variables

```bash
cd /home/barch/projects/chenaniah/backend

# Create .env file
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://chenaniah:30433043@localhost:5432/chenaniah_db

# API Configuration
API_PORT=5001
API_SECRET_KEY=your-super-secret-key-change-this-in-production
NODE_ENV=production

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Coordinator Credentials
COORDINATOR_USERNAME=coordinator
COORDINATOR_PASSWORD=change-this-secure-password

# CORS Origins (comma-separated)
CORS_ORIGINS=https://chenaniah.org,https://www.chenaniah.org

# Audio Files Directory
AUDIO_FILES_DIR=/home/barch/projects/chenaniah/backend/audio_files
EOF

# Secure the .env file
chmod 600 .env
```

**Important:** Change the passwords and secret key to secure values!

## Step 4: Run Database Migrations

```bash
cd /home/barch/projects/chenaniah/backend

# Apply migrations
export DATABASE_URL="postgresql://chenaniah:30433043@localhost:5432/chenaniah_db"
npx prisma migrate deploy

# Verify tables exist
psql -h localhost -U chenaniah -d chenaniah_db -c "\dt"
```

## Step 5: Build and Start with PM2

```bash
cd /home/barch/projects/chenaniah/backend

# Build TypeScript
npm run build

# Start with PM2
pm2 start npm --name "chenaniah-api-v2" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions shown

# Check status
pm2 status
pm2 logs chenaniah-api-v2
```

## Step 6: Configure Nginx Reverse Proxy

Create Nginx configuration for the API:

```bash
sudo nano /etc/nginx/sites-available/chenaniah-api-v2
```

Add this configuration:

```nginx
# Backend API v2 - Node.js
server {
    listen 80;
    server_name chenaniah.org www.chenaniah.org;

    # API v2 location
    location /api/v2/ {
        # Remove /api/v2 prefix before forwarding
        rewrite ^/api/v2/(.*) /$1 break;
        
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering off;
        proxy_request_buffering off;
        client_max_body_size 50M;
    }

    # Your existing frontend/website configuration
    location / {
        # Your existing configuration here
        root /var/www/chenaniah;
        try_files $uri $uri/ =404;
    }
}
```

**Or if you already have an Nginx config for chenaniah.org**, just add the `/api/v2/` location block to your existing server block:

```bash
# Edit existing config
sudo nano /etc/nginx/sites-available/chenaniah

# Add the location /api/v2/ { ... } block shown above
```

Enable and test the configuration:

```bash
# Enable site (if new config)
sudo ln -s /etc/nginx/sites-available/chenaniah-api-v2 /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 7: Setup SSL with Let's Encrypt

```bash
# Install Certbot (if not already installed)
sudo apt install -y certbot python3-certbot-nginx

# Get/renew SSL certificate
sudo certbot --nginx -d chenaniah.org -d www.chenaniah.org

# Test auto-renewal
sudo certbot renew --dry-run
```

After SSL is configured, Nginx will automatically handle HTTPS redirects.

## Step 8: Update Frontend to Use New API

Update the frontend environment variables:

```bash
cd /home/barch/projects/chenaniah/web/chenaniah-web

# Update .env.local or .env.production
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://chenaniah.org/api/v2
EOF
```

## Step 9: Verify Deployment

Test the API endpoints:

```bash
# Test health check
curl https://chenaniah.org/api/v2/health

# Test appointments endpoint (should require auth)
curl https://chenaniah.org/api/v2/api/appointments

# Check PM2 status
pm2 status
pm2 logs chenaniah-api-v2 --lines 50
```

## PM2 Management Commands

```bash
# View logs
pm2 logs chenaniah-api-v2

# Restart API
pm2 restart chenaniah-api-v2

# Stop API
pm2 stop chenaniah-api-v2

# Start API
pm2 start chenaniah-api-v2

# Monitor
pm2 monit

# Show detailed info
pm2 show chenaniah-api-v2
```

## Updating the Backend

When you need to deploy updates:

```bash
cd /home/barch/projects/chenaniah/backend

# Pull latest changes
git pull origin dev

# Install any new dependencies
npm install

# Run migrations (if any)
npx prisma migrate deploy

# Rebuild
npm run build

# Restart with PM2
pm2 restart chenaniah-api-v2

# Check logs
pm2 logs chenaniah-api-v2
```

## Troubleshooting

### API not responding

```bash
# Check if PM2 process is running
pm2 status

# Check logs
pm2 logs chenaniah-api-v2 --lines 100

# Check if port 5001 is listening
sudo netstat -tlnp | grep 5001

# Restart
pm2 restart chenaniah-api-v2
```

### Database connection issues

```bash
# Test database connection
psql -h localhost -U chenaniah -d chenaniah_db -c "SELECT COUNT(*) FROM students;"

# Check DATABASE_URL in .env
cat /home/barch/projects/chenaniah/backend/.env | grep DATABASE_URL
```

### Nginx issues

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Permission issues

```bash
# Ensure audio_files directory exists and is writable
mkdir -p /home/barch/projects/chenaniah/backend/audio_files
chmod 755 /home/barch/projects/chenaniah/backend/audio_files
```

## Monitoring and Logs

```bash
# Real-time logs
pm2 logs chenaniah-api-v2

# System logs
journalctl -u nginx -f

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## Backup

Regular backups are important:

```bash
# Backup database
pg_dump -h localhost -U chenaniah -d chenaniah_db > chenaniah_backup_$(date +%Y%m%d).sql

# Backup audio files
tar -czf audio_files_backup_$(date +%Y%m%d).tar.gz audio_files/
```

## Security Checklist

- [ ] Changed default passwords in .env
- [ ] Changed API_SECRET_KEY to a strong random value
- [ ] SSL certificate installed and working
- [ ] Firewall configured (allow 80, 443, 22)
- [ ] Database password is strong
- [ ] .env file permissions set to 600
- [ ] PM2 startup script configured
- [ ] Regular backups scheduled

## API Endpoints

Once deployed, the API will be available at:

- Base URL: `https://chenaniah.org/api/v2`
- Health: `GET /health`
- Auth: `POST /auth/student/register`, `POST /auth/student/login`
- Appointments: `GET /api/appointments`
- Students: `GET /api/students/:id`
- And more...

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs chenaniah-api-v2`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify database connection
4. Check firewall settings

