# Multi-stage build for Node.js TypeScript application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files for all workspaces
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/ ./shared/

# Install ALL dependencies (including devDependencies for build)
WORKDIR /app/server
RUN npm ci

# Copy source code
COPY server/ ./

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production

# Copy built artifacts from builder
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/shared ../shared

# Expose port
EXPOSE ${PORT:-5000}

# Start the application
CMD ["npm", "start"]