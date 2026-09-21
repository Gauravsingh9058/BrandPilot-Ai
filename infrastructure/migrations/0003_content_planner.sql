-- VidSnapAI: Migration 0003_content_planner.sql
-- Phase 4: 30-Day Autonomous Content Planner

-- 1. Content Plans Table
CREATE TABLE IF NOT EXISTS content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  objective VARCHAR(255) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 30,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  version INTEGER NOT NULL DEFAULT 1,
  plan_group_id UUID NOT NULL DEFAULT gen_random_uuid(),
  strategy_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_plans_brand_id_idx ON content_plans(brand_id);
CREATE INDEX IF NOT EXISTS content_plans_campaign_id_idx ON content_plans(campaign_id);
CREATE INDEX IF NOT EXISTS content_plans_workspace_id_idx ON content_plans(workspace_id);
CREATE INDEX IF NOT EXISTS content_plans_status_idx ON content_plans(status);
CREATE UNIQUE INDEX IF NOT EXISTS content_plans_group_version_idx ON content_plans(plan_group_id, version);

-- 2. Content Jobs Table
CREATE TABLE IF NOT EXISTS content_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_plan_id UUID NOT NULL REFERENCES content_plans(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  funnel_stage VARCHAR(50) NOT NULL,
  content_pillar VARCHAR(255) NOT NULL,
  objective VARCHAR(500) NOT NULL,
  audience VARCHAR(500) NOT NULL,
  topic VARCHAR(500) NOT NULL,
  hook TEXT NOT NULL,
  key_message TEXT NOT NULL,
  messaging_angle VARCHAR(500) NOT NULL,
  offer VARCHAR(500),
  cta VARCHAR(500) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  format VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNED',
  strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS content_jobs_plan_id_idx ON content_jobs(content_plan_id);
CREATE INDEX IF NOT EXISTS content_jobs_brand_id_idx ON content_jobs(brand_id);
CREATE INDEX IF NOT EXISTS content_jobs_campaign_id_idx ON content_jobs(campaign_id);
CREATE INDEX IF NOT EXISTS content_jobs_day_number_idx ON content_jobs(day_number);
CREATE INDEX IF NOT EXISTS content_jobs_scheduled_date_idx ON content_jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS content_jobs_status_idx ON content_jobs(status);
