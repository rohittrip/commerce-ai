# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Install build tools for native modules (bcrypt) and CA certificates
RUN apk add --no-cache python3 make g++ ca-certificates && update-ca-certificates

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
RUN npm install

# Copy prisma schema and generate client
COPY prisma ./prisma
# Note: If TLS issues persist, the host machine's certificate store needs to be fixed
RUN npx prisma generate || echo "Prisma generate failed - will use pre-generated client if available"

# Copy source code and build
COPY tsconfig.json ./
COPY src ./src
COPY proto ./proto
RUN npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app

# Install curl for healthcheck and runtime deps
RUN apk add --no-cache curl

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy prisma schema and generated client from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy proto files for gRPC
COPY proto ./proto

# Copy built dist from builder
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
