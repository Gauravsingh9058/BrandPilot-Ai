# VidSnapAI: Backup & Disaster Recovery Guide

## 1. PostgreSQL Authoritative Database Backup Strategy

PostgreSQL is the single authoritative source of truth for all workspace data, brand DNA, campaigns, reels, render records, Meta publish IDs, analytics, and autonomous engine states.

### 1.1 Automated Daily Full Dump
Run scheduled logical backups via `pg_dump`:

```bash
# Automated daily dump with compression
pg_dump -Fc --no-acl --no-owner -h "$POSTGRES_HOST" -U "$POSTGRES_USER" "$POSTGRES_DB" > "/backups/vidsnapai_$(date +%Y%m%d_%H%M%S).dump"
```

### 1.2 Point-In-Time Recovery (PITR) with WAL Archiving
In cloud environments (AWS RDS, GCP Cloud SQL, Supabase, Neon):
- Enable continuous Write-Ahead Log (WAL) archiving.
- Configure retention period (minimum 14 days, recommended 30 days).

### 1.3 Database Restore Procedure
To restore a backup into a fresh or recovered database:

```bash
# Drop and recreate target database if performing full recovery
dropdb -h "$POSTGRES_HOST" -U "$POSTGRES_USER" vidsnapai
createdb -h "$POSTGRES_HOST" -U "$POSTGRES_USER" vidsnapai

# Restore dump
pg_restore -v --clean --if-exists --no-acl --no-owner -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d vidsnapai "/backups/vidsnapai_latest.dump"

# Run migrations to verify schema alignment
pnpm db:migrate
```

---

## 2. Storage & Asset Backup Strategy

Video renders, voice assets, music tracks, and brand logos are persisted in object storage (S3 / GCS / local storage volume).

### 2.1 Object Storage Replication
- Enable Cross-Region Replication (CRR) on the primary storage bucket.
- Enable bucket versioning to guard against accidental object deletions or overwrites.
- Configure lifecycle rules for temporary files (delete raw render scratch files after 7 days, retain final `.mp4` outputs indefinitely).

### 2.2 Local Volume Backup (Self-Hosted)
```bash
# Sync local uploads directory to offsite backup
rsync -avz --delete /var/lib/vidsnapai/uploads/ backup-server:/backups/vidsnapai-assets/
```

---

## 3. Redis Recovery Expectations

Redis is utilized for:
- BullMQ asynchronous queues (video render, voice generation, Meta publishing, autonomous operations).
- In-memory rate limiting and session caches.

### Key Recovery Principle:
- **Redis is NEVER the source of truth.**
- If Redis crashes, is restarted, or loses state:
  1. No campaign, reel, or analytics state in PostgreSQL is lost.
  2. Workers reconnect automatically with exponential backoff.
  3. Stalled jobs are re-evaluated based on the database state (`IN_PRODUCTION`, `PENDING`).
  4. Work can be resumed without duplicating publishing or creating orphaned records.

---

## 4. Secret Recovery & Key Rotation

- Store secrets in encrypted secret managers (AWS Secrets Manager, GCP Secret Manager, Vault, or 1Password Connect).
- Periodically rotate `SESSION_SECRET` (invalidates active web sessions, requiring user login).
- Periodically rotate `META_APP_SECRET` and refresh OAuth tokens via the Meta Developer Portal.
