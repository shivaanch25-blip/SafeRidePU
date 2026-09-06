# Multi-stage production build for SafeRide PU
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package descriptors
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install all dependencies (workspaces)
RUN npm ci

# Copy source files
COPY shared/ ./shared/
COPY server/ ./server/
COPY client/ ./client/
COPY tsconfig.json ./

# Compile all workspaces (shared -> server -> client)
RUN npm run build

# Stage 2: Production runtime
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy root package.json for workspaces setup
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built outputs
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist

# Security: Run as non-root node user
USER node

EXPOSE 5000

CMD ["node", "server/dist/server.js"]
