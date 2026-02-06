# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY tsconfig.json ./
COPY src ./src
COPY proto ./proto
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy proto files
COPY proto ./proto

# Copy built dist from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3001 50051

CMD ["node", "dist/main.js"]
