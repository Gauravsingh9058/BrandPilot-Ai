-- VidSnapAI Phase 15: SaaS Commercialization, Subscriptions, Usage Metering & Billing Invoices

CREATE TABLE IF NOT EXISTS workspace_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  tier VARCHAR(50) NOT NULL DEFAULT 'FREE',
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS workspace_subscriptions_workspace_id_idx ON workspace_subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS workspace_subscriptions_tier_idx ON workspace_subscriptions(tier);
CREATE INDEX IF NOT EXISTS workspace_subscriptions_status_idx ON workspace_subscriptions(status);
CREATE INDEX IF NOT EXISTS workspace_subscriptions_stripe_customer_id_idx ON workspace_subscriptions(stripe_customer_id);

CREATE TABLE IF NOT EXISTS workspace_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  period_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  reels_generated INTEGER NOT NULL DEFAULT 0,
  reels_rendered INTEGER NOT NULL DEFAULT 0,
  reels_published INTEGER NOT NULL DEFAULT 0,
  campaigns_created INTEGER NOT NULL DEFAULT 0,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  meta_ads_spend REAL NOT NULL DEFAULT 0,
  ai_tokens_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(workspace_id, period_month)
);
CREATE INDEX IF NOT EXISTS workspace_usage_records_workspace_id_idx ON workspace_usage_records(workspace_id);
CREATE INDEX IF NOT EXISTS workspace_usage_records_period_month_idx ON workspace_usage_records(period_month);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE,
  amount_due_usd REAL NOT NULL DEFAULT 0,
  amount_paid_usd REAL NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'PAID',
  invoice_url TEXT,
  pdf_url TEXT,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS billing_invoices_workspace_id_idx ON billing_invoices(workspace_id);
CREATE INDEX IF NOT EXISTS billing_invoices_stripe_invoice_id_idx ON billing_invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS billing_invoices_status_idx ON billing_invoices(status);
