# ==============================================================================
# VidSnapAI API Server - Production Dockerfile
# Multi-stage build for minimal image size and high security
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
COPY apps/worker/ ./apps/worker/
COPY apps/web/ ./apps/web/

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@vidsnapai/*" build
RUN pnpm --filter "@vidsnapai/api" build

# Prune dev dependencies for production
RUN pnpm --filter "@vidsnapai/api" deploy --prod /prod/api

# ------------------------------------------------------------------------------
# Production Runtime Stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install runtime tools
RUN apk add --no-cache curl ca-certificates

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 vidsnapai

# Copy built artifacts and production dependencies
COPY --from=builder /prod/api ./
COPY --from=builder /app/packages/database/dist ./packages/database/dist

# Set permissions
RUN chown -R vidsnapai:nodejs /app

USER vidsnapai

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

CMD ["node", "dist/index.js"]
