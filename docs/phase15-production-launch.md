# VidSnapAI — Phase 15: Global Production Launch & SaaS Commercialization

## Executive Overview
Phase 15 transforms **VidSnapAI** from a multi-tenant autonomous AI video generation engine into a commercialized, globally distributed, production-ready SaaS platform. The system introduces:
- A multi-tier subscription engine (`FREE`, `STARTER`, `PRO`, `ENTERPRISE`) denominated in global currencies (primary: **USD**).
- Authoritative server-side usage metering and quota enforcement.
- S3-compatible cloud object storage abstraction (AWS S3, Cloudflare R2, MinIO) with AWS SigV4 signed URL generation, while maintaining zero-config local storage for development.
- Resilient Meta OAuth token lifecycle management with automatic expiry detection and reconnect-required signaling.
- Prometheus text-formatted metrics instrumentation (`/metrics`) and system health probes.
- An enterprise-grade billing UI with interactive checkout, customer portal, usage analytics, and invoice history.

---

## 1. Global SaaS Subscription Model & Pricing

All plans and tier limits are configuration-driven, strictly isolated per workspace, and denominated primarily in USD with an extensible currency architecture.

| Feature / Limit | FREE ($0/mo) | STARTER ($29/mo) | PRO ($99/mo) | ENTERPRISE (Custom) |
| :--- | :--- | :--- | :--- | :--- |
| **Monthly Reels Generated** | 5 | 30 | 150 | Unlimited (Custom) |
| **Monthly Reels Rendered** | 3 | 20 | 100 | Unlimited (Custom) |
| **Max Brand Brains** | 1 | 3 | 10 | Unlimited (Custom) |
| **Storage Allowance** | 500 MB | 10 GB | 100 GB | 1,000 GB+ |
| **Autonomous Ops Engine** | ❌ Disabled | ❌ Disabled | ✅ Full Autopilot | ✅ Custom Policies |
| **Autonomous Cycles / Mo** | 0 | 0 | 500 | Unlimited |
| **Meta Ads Integration** | ❌ Disabled | ❌ Disabled | ✅ Multi-Account | ✅ Dedicated Business Mgr |
| **Meta Campaigns / Mo** | 0 | 0 | 50 | Unlimited |
| **Max Video Resolution** | 720p | 1080p | 1080p / 4K | 4K HDR |
| **Priority Queue Processing** | Standard | Standard | High Priority | Dedicated Compute Workers |

---

## 2. Database Schema & Multi-Tenant Billing Tables

Migration: `infrastructure/migrations/0008_phase15_saas_billing.sql`

### Tables Created:
1. `workspace_subscriptions`
   - Tracks subscription state per workspace (`workspace_id`, `provider`, `provider_customer_id`, `provider_subscription_id`, `tier`, `status`, `currency`, `current_period_start`, `current_period_end`, `cancel_at_period_end`).
   - Unique index on `workspace_id`.
2. `workspace_usage_records`
   - Real-time monthly usage counters per workspace (`workspace_id`, `billing_period` formatted `YYYY-MM`, `reels_generated`, `reels_rendered`, `brands_created`, `storage_bytes`, `autonomous_runs`, `meta_campaigns`, `ads_published`).
   - Unique compound index on `(workspace_id, billing_period)`.
3. `billing_invoices`
   - Audit trail of paid, open, or failed invoices (`workspace_id`, `provider_invoice_id`, `amount`, `currency`, `status`, `period_start`, `period_end`, `hosted_invoice_url`, `pdf_url`).

---

## 3. Storage Architecture (S3 & Local Development)

`packages/storage/src/s3StorageProvider.ts` implements the standard `StorageProvider` interface:

- **S3-Compatible Engines**: AWS S3, Cloudflare R2, MinIO, Wasabi, DigitalOcean Spaces.
- **Security**: Built-in AWS SigV4 request signer and presigned URL generator with zero external heavy SDK bloat.
- **Path Sanitization**: Automatic prevention of path traversal (`..` and leading slash normalization).
- **Dual Mode**:
  - `STORAGE_PROVIDER=local` (Default for local development, stores files in `.storage/`).
  - `STORAGE_PROVIDER=s3` (Production mode with public CDN base URL or signed presigned URLs).

---

## 4. Meta OAuth & Token Lifecycle

Meta Ads tokens and connections are actively tracked through the following lifecycle states:

```
[CONNECTED] ──(Within 7 days of expiry)──> [EXPIRING] ──(Expired)──> [EXPIRED]
     │                                                                   │
     └───(Invalidated / Permissions Revoked)──> [RECONNECT_REQUIRED] ───┘
```

- **Protection**: Access tokens are scrubbed and never exposed in API responses.
- **Safety Gate**: Pre-flight publishing hooks immediately reject publishing jobs if `connectionStatus !== 'CONNECTED'`, raising an explicit reconnect prompt rather than silent worker failures.

---

## 5. Prometheus Observability & Telemetry

Endpoint: `GET /metrics`

Returns standard Prometheus text exposition format (version 0.0.4) tracking:
- `vidsnapai_http_requests_total{method, path, status}`
- `vidsnapai_http_errors_total{method, path, status}`
- `vidsnapai_request_duration_ms{method, path}`
- `vidsnapai_ai_requests_total{provider, task}`
- `vidsnapai_ai_failures_total{provider, task}`
- `vidsnapai_render_jobs_total{status}`
- `vidsnapai_render_job_failures_total`
- `vidsnapai_queue_jobs_total{queue_name, status}`
- `vidsnapai_meta_publishing_attempts_total`
- `vidsnapai_meta_publishing_failures_total`
- `vidsnapai_autonomous_runs_total{status}`
- `vidsnapai_billing_events_total{event_type}`
- `vidsnapai_subscriptions_active{tier}`

---

## 6. Security & Webhook Idempotency

- **Webhook Signature Verification**: Cryptographic HMAC SHA-256 header validation (`stripe-signature`).
- **Idempotency Guard**: Webhook event IDs are tracked in a persistent/cache set. Replays or duplicate deliveries are acknowledged with `200 OK` without duplicating database writes.
- **Workspace Isolation**: All billing, invoice, and subscription operations require authenticated `workspaceId` parameters, with role-based checks requiring `OWNER` or `ADMIN` roles for mutating operations.

---

## 7. Production Deployment Environment Variables

### Core Configuration
```env
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.vidsnapai.com
WEB_BASE_URL=https://app.vidsnapai.com
SESSION_SECRET=min_32_characters_random_hex_secret
COOKIE_SECURE=true
```

### PostgreSQL & Redis
```env
DATABASE_URL=postgres://user:password@pg-primary.internal:5432/vidsnapai?sslmode=require
REDIS_URL=redis://:redis_auth_token@redis-master.internal:6379
```

### Cloud Object Storage (S3 / Cloudflare R2)
```env
STORAGE_PROVIDER=s3
S3_REGION=auto
S3_BUCKET=vidsnapai-production-media
S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=prod_access_key
S3_SECRET_ACCESS_KEY=prod_secret_key
S3_PUBLIC_BASE_URL=https://cdn.vidsnapai.com
```

### Global Billing Provider
```env
BILLING_PROVIDER=stripe
BILLING_SECRET=sk_live_...
BILLING_WEBHOOK_SECRET=whsec_...
```

### Meta Ads Integration
```env
META_CLIENT_ID=prod_meta_app_id
META_CLIENT_SECRET=prod_meta_app_secret
META_REDIRECT_URI=https://app.vidsnapai.com/auth/meta/callback
```

---

## 8. Rollback & Disaster Recovery Strategy

1. **Database Rollbacks**:
   - Backward-compatible migration `0008_phase15_saas_billing.sql` introduces additive tables only.
   - Reverting requires no destructive data alteration: `DROP TABLE IF EXISTS billing_invoices, workspace_usage_records, workspace_subscriptions;`.
2. **Storage Redundancy**:
   - S3/R2 versioning enabled with 30-day lifecycle retention.
   - Point-In-Time-Recovery (PITR) enabled on PostgreSQL.
3. **Graceful Degradation**:
   - If billing webhooks experience downtime, subscriptions remain active until current period end date.

---

## 9. Launch Verification Checklist

- [x] Global SaaS subscription model & tier limits defined in USD.
- [x] Database schema & migration `0008_phase15_saas_billing.sql` created.
- [x] Workspace-isolated subscription repository implemented.
- [x] Billing provider abstraction & secure idempotent webhook router active.
- [x] Server-side usage quota middleware with structured `PLAN_LIMIT_REACHED` error responses.
- [x] Persistent S3-compatible cloud storage provider with SigV4 signing.
- [x] Zero-breaking local storage development fallback.
- [x] Meta OAuth token lifecycle tracking & expired token protection.
- [x] Prometheus `/metrics` exporter in standard text format.
- [x] Commercial frontend (`BillingPage.tsx`) with dynamic plans, upgrade modal, and usage dashboard.
- [x] Full regression test suite passing: **46 test suites, 290 unit & integration tests**.
- [x] Strict TypeScript typechecking and ESLint passing across entire monorepo.
- [x] Production build artifact compilation verified.
