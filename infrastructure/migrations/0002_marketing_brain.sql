-- VidSnapAI: Migration 0002_marketing_brain.sql
-- Phase 3: Marketing Brain + Campaign Engine

-- 1. Marketing Strategies Table
CREATE TABLE IF NOT EXISTS marketing_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  objective VARCHAR(100) NOT NULL,
  business_goal TEXT NOT NULL,
  marketing_goal TEXT NOT NULL,
  target_audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  positioning JSONB NOT NULL DEFAULT '{}'::jsonb,
  messaging_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  content_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  funnel_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  channel_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  offer_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  kpi_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  risks_and_guardrails JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS marketing_strategies_brand_id_idx ON marketing_strategies(brand_id);
CREATE UNIQUE INDEX IF NOT EXISTS marketing_strategies_brand_version_unique_idx ON marketing_strategies(brand_id, version);

-- 2. Campaigns Table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  objective VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  target_audience JSONB DEFAULT '{}'::jsonb,
  core_message TEXT,
  offer TEXT,
  primary_cta VARCHAR(255),
  content_pillars JSONB DEFAULT '[]'::jsonb,
  channels JSONB DEFAULT '[]'::jsonb,
  campaign_strategy JSONB,
  strategy_version INTEGER NOT NULL DEFAULT 0,
  kpis JSONB DEFAULT '{}'::jsonb,
  guardrails JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaigns_brand_id_idx ON campaigns(brand_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);
