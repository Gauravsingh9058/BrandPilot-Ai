# VidSnapAI — Local Development & Runbook

## Prerequisites

- **Node.js**: `v20+` or `v22+`
- **pnpm**: `v9+` or `v10+` (or `v12+`)
- **Docker & Docker Compose** (optional if using local PostgreSQL and Redis)

---

## 1. Quick Start

### Step 1: Install Dependencies
```bash
pnpm install
```

### Step 2: Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure database credentials, Redis URL, and `SESSION_SECRET` are properly set.

### Step 3: Start Infrastructure (PostgreSQL & Redis)
Using Docker Compose:
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

### Step 4: Run Database Migrations
```bash
pnpm db:migrate
```

### Step 5: Start Development Servers
```bash
# Start all apps simultaneously (API, Web, Worker)
pnpm dev

# Or start specific applications:
pnpm dev:api      # REST API on http://localhost:4000
pnpm dev:web      # Web UI on http://localhost:5173
pnpm dev:worker   # BullMQ Worker
```

---

## 2. Quality Assurance Commands

```bash
# Run all automated tests
pnpm test

# Run TypeScript compilation checks across all packages and apps
pnpm typecheck

# Run ESLint across entire codebase
pnpm lint

# Build all packages and applications for production
pnpm build
```

---

## 3. Database Management

```bash
# Generate new migration files from Drizzle schema modifications
pnpm db:generate

# Apply pending SQL migrations to database
pnpm db:migrate
```

---

## 4. API Endpoints Reference

### Health
- `GET /api/health`: System health probe (PostgreSQL, Redis, REST API).

### Authentication
- `POST /api/auth/signup`: Create user account & default workspace.
- `POST /api/auth/login`: Authenticate and start session cookie.
- `POST /api/auth/logout`: Terminate active session and clear cookie.
- `GET /api/auth/me`: Current session user profile and workspace list.

### Workspaces & RBAC
- `POST /api/workspaces`: Create new multi-tenant workspace.
- `GET /api/workspaces`: List caller's workspaces with member counts.
- `GET /api/workspaces/:id`: Get workspace details and members list.
- `POST /api/workspaces/:id/members`: Add user to workspace (`ADMIN` or `OWNER` required).
- `DELETE /api/workspaces/:id/members/:memberId`: Remove user from workspace (`ADMIN` or `OWNER` required).

### Queue Verification
- `POST /api/queue/test-job`: Enqueue test background job to BullMQ worker.
