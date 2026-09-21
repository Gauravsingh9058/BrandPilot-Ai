# ==============================================================================
# VidSnapAI Web Application - Production Dockerfile
# Multi-stage build with Nginx for optimized static asset serving
# ==============================================================================

FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install dependencies and build
RUN pnpm install --frozen-lockfile
RUN pnpm --filter "@vidsnapai/types" build
RUN pnpm --filter "@vidsnapai/web" build

# ------------------------------------------------------------------------------
# Production Nginx Runtime Stage
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Copy custom Nginx configuration
COPY infrastructure/docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
