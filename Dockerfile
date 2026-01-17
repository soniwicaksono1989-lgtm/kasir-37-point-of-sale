# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Build the server
RUN npx tsc server/index.ts --outDir server-dist --esModuleInterop --module commonjs --target ES2020 --moduleResolution node --skipLibCheck

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Install additional production dependencies for the server
RUN npm install express cors pg

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy built server from builder
COPY --from=builder /app/server-dist ./server-dist

# Expose port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the server
CMD ["node", "server-dist/index.js"]
