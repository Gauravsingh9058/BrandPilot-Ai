# VidSnapAI: Production Deployment & Scale Readiness Guide

## 1. System Architecture Overview

VidSnapAI consists of three decoupled operational tiers:
1. **Web Dashboard (`apps/web`)**: Static / SSR single-page application built with React, Vite, and TanStack Query.
2. **REST API Server (`apps/api`)**: Stateless Express TypeScript API service with session authentication, rate limiting, and BullMQ queue dispatchers.
3. **Async Workers (`apps/worker`)**: BullMQ worker fleet processing 14 parallel queues (Video rendering via FFmpeg, Gemini AI synthesis, Pexels media resolution, ElevenLabs voice synthesis, Meta Ads publishing, Analytics sync, and Autonomous operations).

---

## 2. Environment Configuration

### Required Production Environment Variables
Set these variables in your deployment environment (e.g., Kubernetes Secrets, ECS Task Definition, Railway, Render, Fly.io):

```env
NODE_ENV=production
PORT=4000
API_BASE_URL=https://api.vidsnapai.com
WEB_BASE_URL=https://app.vidsnapai.com
DATABASE_URL=postgresql://user:password@pg-host:5432/vidsnapai?sslmode=require
REDIS_URL=rediss://default:password@redis-host:6379
SESSION_SECRET=a_very_long_secure_32_character_random_hex_key_here
COOKIE_DOMAIN=.vidsnapai.com
COOKIE_SECURE=true
STORAGE_PROVIDER=local
STORAGE_BUCKET=vidsnapai-production-assets
GEMINI_API_KEY=AIzaSy...
PEXELS_API_KEY=...
META_APP_ID=...
META_APP_SECRET=...
META_REDIRECT_URI=https://api.vidsnapai.com/api/meta/auth/callback
```

---

## 3. Production Build & Startup Commands

### 3.1 Build the Monorepo
```bash
pnpm install --frozen-lockfile
pnpm build
```

### 3.2 Execute Database Migrations
```bash
pnpm db:migrate
```

### 3.3 Start API Service
```bash
node apps/api/dist/index.js
```

### 3.4 Start Worker Fleet
```bash
node apps/worker/dist/index.js
```

### 3.5 Serve Web Frontend
Serve the pre-built `apps/web/dist` assets using Nginx, Cloudflare Pages, AWS CloudFront + S3, or Vercel.

---

## 4. Health Checks & Probes

| Probe Type | Path | Purpose |
|---|---|---|
| **Liveness** | `GET /health` | Validates API process is running and responding |
| **Readiness** | `GET /health/ready` | Verifies active PostgreSQL and Redis connectivity before routing traffic |
| **Metrics** | `GET /api/health/metrics` | Returns operational latency, status code counts, and active queue counts |

---

## 5. Graceful Shutdown & Zero-Downtime Deployment

- Both API and Worker processes register signal handlers for `SIGINT` and `SIGTERM`.
- When a `SIGTERM` is received:
  1. API stops accepting new HTTP connections and allows in-flight requests to complete within 10 seconds.
  2. Workers complete active video rendering or publishing jobs before exiting cleanly.
  3. Redis connections and PostgreSQL connection pools are drained and closed.
