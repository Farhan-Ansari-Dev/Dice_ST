# Production Dockerfile for Sanyog Conformity backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json package-lock.json* ./
RUN npm ci --include=dev

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Strip dev dependencies
RUN npm prune --omit=dev

# ─── Runtime stage ────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy only what's needed at runtime
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY src/db ./src/db

# Create uploads dir for dev fallback (production uses S3)
RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 5000

# Healthcheck used by Railway/Render/K8s probes
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]
