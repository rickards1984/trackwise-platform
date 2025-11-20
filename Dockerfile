# Stage 1: Build the Client (Frontend)
FROM node:18-alpine AS client-builder
WORKDIR /app

# Copy client package files and install dependencies
COPY client/package*.json ./client/
# Copy the root package-lock to ensure consistent dependencies
COPY package-lock.json ./
WORKDIR /app/client
RUN npm ci

# Copy client source code and build
WORKDIR /app
COPY client/ ./client/
RUN npm run build -w trackwise-client

# Stage 2: Build the Server (Backend)
FROM node:18-alpine AS server-builder
WORKDIR /app

# Copy all package files and install dependencies for the server
COPY package*.json ./
COPY server/package*.json ./server/
COPY shared/ ./shared/
WORKDIR /app/server
RUN npm ci

# Copy server source code and build
COPY server/ ./
# Also copy shared code as it's a dependency for the build
COPY shared/ ../shared/
RUN npm run build

# Stage 3: Final Production Image
FROM node:18-alpine
WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy server's production dependencies' manifest
COPY server/package*.json ./
# Install only production dependencies
RUN npm ci --only=production

# Copy built artifacts from the previous stages
# Copy the built server code
COPY --from=server-builder /app/server/dist ./dist
# Copy the shared code
COPY --from=server-builder /app/shared ./shared
# Copy the built client code into a 'public' folder for the server to use
COPY --from=client-builder /app/client/dist ./dist/public

# Expose the port the app will run on
EXPOSE ${PORT:-5000}

# Command to start the server
CMD [ "npm", "start" ]