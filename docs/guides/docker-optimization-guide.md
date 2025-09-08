# Docker Optimization Guide

## Overview

This guide provides optimization techniques for Docker containers and images to improve performance, reduce size, and enhance security.

## Image Optimization

### Multi-stage Builds

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Layer Optimization

```dockerfile
# Bad: Creates multiple layers
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y wget
RUN apt-get clean

# Good: Single layer
RUN apt-get update && \
    apt-get install -y curl wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### Base Image Selection

```dockerfile
# Use specific versions
FROM node:18.17.0-alpine

# Use distroless for production
FROM gcr.io/distroless/nodejs18-debian11

# Use scratch for minimal images
FROM scratch
```

## Container Optimization

### Resource Limits

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    image: salespot/api:latest
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### Health Checks

```dockerfile
# Dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

```yaml
# docker-compose.yml
services:
  api:
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Performance Optimization

### Build Optimization

```dockerfile
# Use .dockerignore
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.nyc_output
.coverage
.coverage/
.pytest_cache
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
```

### Caching Optimization

```dockerfile
# Copy package files first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy source code last
COPY . .
```

### BuildKit Features

```dockerfile
# syntax=docker/dockerfile:1
FROM node:18-alpine

# Use BuildKit cache mounts
RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production
```

## Security Optimization

### Non-root User

```dockerfile
# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Switch to non-root user
USER nextjs
```

### Security Scanning

```bash
# Scan for vulnerabilities
cd /home/boss/Projects/dev && docker scan salespot/api:latest

# Use Trivy for security scanning
cd /home/boss/Projects/dev && docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image salespot/api:latest
```

### Minimal Base Images

```dockerfile
# Use distroless images
FROM gcr.io/distroless/nodejs18-debian11

# Copy only necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
```

## Monitoring and Logging

### Log Configuration

```yaml
# docker-compose.yml
services:
  api:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

### Metrics Collection

```dockerfile
# Add metrics endpoint
EXPOSE 9090
CMD ["node", "--inspect=0.0.0.0:9229", "dist/main.js"]
```

## Best Practices

### Image Size Reduction

1. **Use Alpine Linux**: Smaller base images
2. **Multi-stage builds**: Separate build and runtime
3. **Remove unnecessary packages**: Clean up after installation
4. **Use .dockerignore**: Exclude unnecessary files

### Build Performance

1. **Layer caching**: Order commands by frequency of change
2. **Parallel builds**: Use BuildKit for parallel execution
3. **Build context**: Minimize build context size
4. **Registry caching**: Use registry cache for dependencies

### Runtime Performance

1. **Resource limits**: Set appropriate CPU and memory limits
2. **Health checks**: Implement proper health monitoring
3. **Logging**: Configure appropriate log levels
4. **Monitoring**: Add metrics and monitoring

## Troubleshooting

### Common Issues

1. **Large image sizes**

   ```bash
   cd /home/boss/Projects/dev && docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
   ```

2. **Slow builds**

   ```bash
   cd /home/boss/Projects/dev && docker build --progress=plain -t salespot/api:latest .
   ```

3. **Memory issues**
   ```bash
   cd /home/boss/Projects/dev && docker stats
   ```

### Debug Commands

```bash
# Inspect image layers
cd /home/boss/Projects/dev && docker history salespot/api:latest

# Check container resources
cd /home/boss/Projects/dev && docker stats --no-stream

# Analyze image
cd /home/boss/Projects/dev && docker run --rm -it salespot/api:latest sh
```

## Optimization Checklist

### Image Optimization

- [ ] Use multi-stage builds
- [ ] Optimize layer ordering
- [ ] Use appropriate base images
- [ ] Implement .dockerignore
- [ ] Remove unnecessary packages

### Container Optimization

- [ ] Set resource limits
- [ ] Implement health checks
- [ ] Use non-root user
- [ ] Configure logging
- [ ] Add monitoring

### Security

- [ ] Scan for vulnerabilities
- [ ] Use minimal base images
- [ ] Implement security best practices
- [ ] Regular updates
- [ ] Access controls

### Performance

- [ ] Optimize build time
- [ ] Reduce image size
- [ ] Improve runtime performance
- [ ] Monitor resource usage
- [ ] Implement caching strategies
