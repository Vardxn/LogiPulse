# ==========================================
# STAGE 1: Build Engine
# ==========================================
FROM node:20-alpine AS builder

# Install build dependencies required for native node modules if any
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copy monorepo root settings & configuration rules
COPY package*.json ./
COPY tsconfig*.json ./

# Copy individual workspace structural packages
COPY routing-engine/package*.json ./routing-engine/
COPY server/package*.json ./server/

# Install full development dependencies for compilation across the monorepo scope
RUN npm ci

# Copy absolute workspace source code chunks
COPY routing-engine ./routing-engine
COPY server ./server

# Generate Prisma Engine Client artifacts to avoid caching issues during compilation
RUN npx prisma generate --schema=./server/prisma/schema.prisma

# Build the server target alongside the dependent internal shared library
RUN npm run build --workspace=routing-engine
RUN npm run build --workspace=server

# ==========================================
# STAGE 2: Production Runtime Environment
# ==========================================
FROM node:20-alpine AS runner

ENV NODE_ENV=production
WORKDIR /app

# Install runtime dependencies (OpenSSL is required by Prisma query engine)
RUN apk add --no-cache openssl libc6-compat

# Enforce secure system execution rules using a non-root Alpine system profile
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeapp

# Copy essential monorepo baseline configuration
COPY package*.json ./

# Copy compiled structural output assets from build engine phase
COPY --from=builder /app/routing-engine/dist ./routing-engine/dist
COPY --from=builder /app/routing-engine/package*.json ./routing-engine/
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package*.json ./server/
COPY --from=builder /app/server/prisma ./server/prisma

# Install absolute minimal production requirements without dev dependencies
RUN npm ci --only=production --cache .npm-cache && rm -rf .npm-cache

# Generate Prisma Client specifically in the runner environment
RUN npx prisma generate --schema=./server/prisma/schema.prisma

# Adjust standard operational ownership permissions to the non-root runner profile
RUN chown -R nodeapp:nodejs /app
USER nodeapp

EXPOSE 5001
ENV PORT=5001

# Execute runtime process cleanly via node targeting main controller entrypoint
CMD ["node", "server/dist/server.js"]
