FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY server/package*.json ./server/
COPY shared/ ./shared/

# Install dependencies
WORKDIR /app/server
RUN npm ci --only=production

# Copy built server code
COPY server/ ./

# Build the application
RUN npm run build

# Expose port
EXPOSE ${PORT:-5000}

# Start the application
CMD ["npm", "start"]