# Multi-stage build for SaleSpot API - Optimized for Production
FROM node:20-slim AS base

# Install system dependencies and pnpm
RUN apt-get update && apt-get install -y \
    dumb-init \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@latest

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files with proper layer caching
COPY package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json

# Install all dependencies (including devDependencies) with cache optimization
RUN pnpm install --frozen-lockfile --prefer-offline

# Build stage
FROM base AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source code with .dockerignore optimization
COPY . .

# Build the application with optimizations
RUN cd apps/api && \
    pnpm run type-check && \
    pnpm run lint && \
    pnpm run build

# Production runtime stage
FROM gcr.io/distroless/nodejs20-debian12 AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3001
ENV TZ=UTC

# Create non-root user for security
USER 1001:1001

# Copy only production dependencies and built application
COPY --from=builder --chown=1001:1001 /app/apps/api/dist ./dist
COPY --from=builder --chown=1001:1001 /app/apps/api/package.json ./package.json
COPY --from=builder --chown=1001:1001 /app/packages/shared/dist ./packages/shared/dist

# Expose port
EXPOSE 3001

# Health check with proper error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))" || exit 1

# Start the application with proper signal handling
ENTRYPOINT ["node", "dist/main.js"]
