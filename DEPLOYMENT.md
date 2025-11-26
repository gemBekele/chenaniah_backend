# Backend Deployment Guide

## Deployment to chenaniah.org/api/v2

### 1. Prerequisites

- Node.js 18+ installed on server
- PostgreSQL installed and running
- Nginx configured
- PM2 for process management

### 2. Database Setup

```bash
# Create database (if not already done)
sudo -u postgres psql -c "ALTER DATABASE chenaniah_db OWNER TO chenaniah;"

# Apply migrations
export DATABASE_URL="postgresql://chenaniah:30433043@localhost:5432/chenaniah_db"
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

### 3. Environment Configuration

Create `.env` file in backend directory:

```bash
DATABASE_URL=postgresql://chenaniah:30433043@localhost:5432/chenaniah_db
API_PORT=5001
API_SECRET_KEY=your-production-secret-key-change-this
ADMIN_USERNAME=admin
ADMIN_PASSWORD=secure-admin-password
COORDINATOR_USERNAME=coordinator
COORDINATOR_PASSWORD=secure-coordinator-password
AUDIO_FILES_DIR=./audio_files
CORS_ORIGINS=https://chenaniah.org,https://www.chenaniah.org
NODE_ENV=production
```

### 4. Build and Install

```bash
cd /home/barch/projects/chenaniah/backend
npm install
npm run build
```

### 5. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'chenaniah-backend-v2',
    script: './dist/server.js',
    cwd: '/home/barch/projects/chenaniah/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Nginx Configuration

Add this to your nginx configuration:

```nginx
# Backend API v2
location /api/v2/ {
    proxy_pass http://localhost:5001/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # CORS headers
    add_header 'Access-Control-Allow-Origin' 'https://chenaniah.org' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With' always;
    
    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://chenaniah.org' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain charset=UTF-8';
        add_header 'Content-Length' 0;
        return 204;
    }
}
```

Reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Test the Deployment

```bash
# Test health endpoint
curl https://chenaniah.org/api/v2/health

# Test appointments endpoint
curl https://chenaniah.org/api/v2/appointments
```

### 8. Frontend Configuration

Update frontend `.env.production`:

```bash
NEXT_PUBLIC_API_URL=https://chenaniah.org/api/v2
```

### 9. Monitoring

```bash
# View logs
pm2 logs chenaniah-backend-v2

# Monitor
pm2 monit

# Restart if needed
pm2 restart chenaniah-backend-v2
```

### 10. Updates

To deploy updates:

```bash
cd /home/barch/projects/chenaniah/backend
git pull origin dev
npm install
npm run build
pm2 restart chenaniah-backend-v2
```

## Troubleshooting

### Port already in use

```bash
# Find process on port 5001
sudo lsof -i :5001

# Kill it if necessary
sudo kill -9 <PID>
```

### Database connection issues

```bash
# Test database connection
psql -h localhost -U chenaniah -d chenaniah_db -c "SELECT version();"
```

### PM2 process issues

```bash
# Delete and restart
pm2 delete chenaniah-backend-v2
pm2 start ecosystem.config.js
pm2 save
```

