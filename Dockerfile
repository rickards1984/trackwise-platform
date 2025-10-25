# Builder stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy manifests for caching
COPY package*.json ./
COPY package-lock.json ./
COPY server/package*.json ./server/

# Copy workspace sources
COPY . .

# Build server
WORKDIR /app/server
RUN npm ci
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

# Copy built server artifacts and package manifest
COPY --from=builder /app/server/dist ./server/dist
COPY server/package*.json ./server/

WORKDIR /app/server
# Install production deps only
RUN npm ci --only=production

EXPOSE 5000
CMD ["npm", "start"]