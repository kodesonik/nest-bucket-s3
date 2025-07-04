# Multi-stage Dockerfile for Digital Bucket

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY views/ ./views/
COPY public/ ./public/

# Build the simplified application (temporarily to test infrastructure)
# RUN npx tsc src/main-simple.ts src/app-simple.module.ts src/health.controller.ts --outDir dist --target es2020 --module commonjs --esModuleInterop --allowSyntheticDefaultImports --experimentalDecorators --emitDecoratorMetadata --moduleResolution node

# Production stage
FROM node:18-alpine AS production

# Install dumb-init and wget for proper signal handling and health checks
RUN apk add --no-cache dumb-init wget

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/views ./views
COPY --from=builder --chown=nestjs:nodejs /app/public ./public

# Create uploads directory
RUN mkdir -p uploads && chown nestjs:nodejs uploads

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the main application
CMD ["node", "dist/main.js"] 