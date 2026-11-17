# ==============================================================================
# Multi-Stage Production Dockerfile for CreatifyX Backend
# Target: Production Linux / Azure App Service (Web App for Containers)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependency Installation & TypeScript Compilation
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Copy package manifests for efficient Docker layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies required for tsc build)
RUN npm ci

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY src/ ./src/
COPY api/ ./api/

# Compile TypeScript into /app/dist
RUN npm run build

# Remove development dependencies to keep production footprint minimal
RUN npm prune --production

# ------------------------------------------------------------------------------
# Stage 2: Minimal, Hardened Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Security & Process Management:
# - dumb-init: Ensures proper PID 1 signal handling (graceful SIGTERM shutdown in Azure)
# - curl: Enables container HEALTHCHECK probes
RUN apk add --no-cache dumb-init curl

# Least Privilege: Create dedicated non-root user and group
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Create uploads storage directory with non-root ownership
RUN mkdir -p /app/uploads && \
    chown -R nodejs:nodejs /app/uploads

# Production environment defaults
ENV NODE_ENV=production
ENV PORT=5000

# Copy built application and production dependencies with non-root ownership
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs --from=builder /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs --from=builder /app/dist ./dist

# Container Healthcheck (polled by Docker & Azure App Service)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT}/health || exit 1

# Drop root privileges
USER nodejs

# Expose backend port
EXPOSE 5000

# Initialize via dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start production server
CMD ["node", "dist/src/server.js"]
