# Observability System Installation Guide

## Requirements

### System Requirements

- **OS**: Linux (Ubuntu 20.04+), macOS, Windows (WSL2)
- **Node.js**: version 18.0.0 or higher
- **npm**: version 8.0.0 or higher
- **RAM**: minimum 4GB (recommended 8GB+)
- **Disk**: minimum 2GB free space

### Check Requirements

```bash
# Check Node.js
node --version

# Check npm
npm --version

# Check free space
df -h

# Check memory
free -h
```

## Installation

### 1. Clone Project

```bash
cd /home/boss/Projects/dev
git clone <repository-url>
cd dev
```

### 2. Install Dependencies

```bash
# Install API dependencies
cd apps/api
npm install

# Install Web dependencies
cd ../web
npm install

# Return to root
cd ../..
```

### 3. Configure Environment Variables

```bash
# Copy example configurations
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit configurations
nano apps/api/.env
nano apps/web/.env
```

### 4. Setup Database

```bash
# Apply migrations
cd apps/api
npm run migration:run

# Generate seed data (optional)
npm run seed
```

### 5. Build Project

```bash
# Build API
cd apps/api
npm run build

# Build Web
cd ../web
npm run build
```

## Configuration

### API Environment Variables (.env)

```env
# Basic settings
NODE_ENV=development
API_PORT=3001
API_HOST=localhost

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Observability
LOG_LEVEL=info
METRICS_ENABLED=true
TRACING_ENABLED=true
DASHBOARD_ENABLED=true

# Elasticsearch (Mock)
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_INDEX=logs
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=

# Jaeger (Mock)
JAEGER_URL=http://localhost:16686
JAEGER_SERVICE_NAME=api-service

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### Web Environment Variables (.env)

```env
# Basic settings
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Observability
NEXT_PUBLIC_OBSERVABILITY_ENABLED=true
NEXT_PUBLIC_METRICS_ENDPOINT=http://localhost:3001/observability/metrics
```

## Script Setup

### 1. Create Scripts Directory

```bash
mkdir -p scripts
```

### 2. Copy Scripts

```bash
# Copy observability script
cp apps/api/scripts/observability.sh scripts/

# Additional scripts created separately
# (monitor.sh, start-all.sh, stop-all.sh)
```

### 3. Set Execute Permissions

```bash
chmod +x scripts/*.sh
```

## Installation Verification

### 1. Start Services

```bash
# Start all services
./scripts/start-all.sh
```

### 2. Check Status

```bash
# Check system status
./scripts/monitor.sh status
```

### 3. Test Endpoints

```bash
# Check health endpoint
curl http://localhost:3001/observability/health

# Check metrics endpoint
curl http://localhost:3001/observability/metrics

# Check dashboard endpoint
curl http://localhost:3001/observability/dashboard/system
```

### 4. Run Tests

```bash
# Run all tests
./scripts/observability.sh test

# Generate test data
./scripts/observability.sh generate
```

## Installation Diagnostics

### Check Ports

```bash
# Check occupied ports
netstat -tlnp | grep -E ":(3000|3001)"

# Or using lsof
lsof -i :3000
lsof -i :3001
```

### Check Processes

```bash
# Check Node.js processes
ps aux | grep node

# Check PID files
ls -la /tmp/*.pid
```

### Check Logs

```bash
# View API logs
tail -f /tmp/observability.log

# View monitoring logs
tail -f /tmp/monitor.log
```

## Docker Installation (Optional)

### 1. Create Dockerfile

```dockerfile
# Dockerfile for API
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["npm", "run", "start:prod"]
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: ./apps/api
    ports:
      - '3001:3001'
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres

  web:
    build: ./apps/web
    ports:
      - '3000:3000'
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: database
      POSTGRES_USER: username
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3. Run with Docker

```bash
# Build and start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Production Setup

### 1. Production Environment Variables

```env
NODE_ENV=production
LOG_LEVEL=warn
METRICS_ENABLED=true
TRACING_ENABLED=true
DASHBOARD_ENABLED=true
```

### 2. PM2 Setup (Optional)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
pm2 init

# Start with PM2
pm2 start ecosystem.config.js
```

### 3. Nginx Setup (Optional)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Installation Issues

### Issue: "Port already in use"

```bash
# Find process on port
lsof -i :3001

# Stop process
kill -9 <PID>
```

### Issue: "Permission denied"

```bash
# Set execute permissions
chmod +x scripts/*.sh

# Check permissions
ls -la scripts/
```

### Issue: "Module not found"

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: "Database connection failed"

```bash
# Check database connection
psql -h localhost -U username -d database

# Check environment variables
echo $DATABASE_URL
```

## Verification Checklist

- [ ] Node.js and npm installed
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Database configured
- [ ] Migrations applied
- [ ] Project built
- [ ] Scripts created and executable
- [ ] Services starting
- [ ] Endpoints responding
- [ ] Tests passing
- [ ] Logs writing
- [ ] Metrics collecting
- [ ] Dashboards loading

## Support

For installation issues:

1. Check system requirements
2. Verify environment variables
3. Check installation logs
4. Refer to troubleshooting guide
