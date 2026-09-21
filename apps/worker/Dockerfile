# ==============================================================================
# VidSnapAI Background Compute Worker - Production Dockerfile
# Includes FFmpeg, fonts, and media dependencies for autonomous rendering
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
RUN pnpm --filter "@vidsnapai/worker" build

# Prune dev dependencies for production
RUN pnpm --filter "@vidsnapai/worker" deploy --prod /prod/worker

# ------------------------------------------------------------------------------
# Production Runtime Stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install FFmpeg, fonts for subtitle/caption rendering, and essential tools
RUN apk add --no-cache \
    ffmpeg \
    fontconfig \
    ttf-dejavu \
    ttf-liberation \
    curl \
    ca-certificates

# Verify FFmpeg installation
RUN ffmpeg -version

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 vidsnapai

# Copy built artifacts and production dependencies
COPY --from=builder /prod/worker ./
COPY --from=builder /app/packages/database/dist ./packages/database/dist

# Set permissions
RUN chown -R vidsnapai:nodejs /app

USER vidsnapai

CMD ["node", "dist/index.js"]
