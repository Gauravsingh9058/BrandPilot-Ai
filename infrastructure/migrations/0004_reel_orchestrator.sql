-- VidSnapAI: Migration 0004_reel_orchestrator.sql
-- Phase 5: Autonomous Reel Orchestrator

-- Reel Production Plans Table
CREATE TABLE IF NOT EXISTS reel_production_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_job_id UUID NOT NULL REFERENCES content_jobs(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  content_plan_id UUID NOT NULL REFERENCES content_plans(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  title VARCHAR(255) NOT NULL,
  concept JSONB NOT NULL DEFAULT '{}'::jsonb,
  objective VARCHAR(500) NOT NULL,
  audience VARCHAR(500) NOT NULL,
  funnel_stage VARCHAR(50) NOT NULL,
  content_pillar VARCHAR(255) NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 30,
  aspect_ratio VARCHAR(20) NOT NULL DEFAULT '9:16',
  platform VARCHAR(50) NOT NULL DEFAULT 'INSTAGRAM',
  format VARCHAR(50) NOT NULL DEFAULT 'REEL',
  hook JSONB NOT NULL DEFAULT '{}'::jsonb,
  narrative TEXT NOT NULL,
  script JSONB NOT NULL DEFAULT '[]'::jsonb,
  scenes JSONB NOT NULL DEFAULT '[]'::jsonb,
  visual_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
  voice_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
  caption_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
  animation_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
  audio_direction JSONB NOT NULL DEFAULT '{}'::jsonb,
  cta JSONB NOT NULL DEFAULT '{}'::jsonb,
  production_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'READY',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reel_production_plans_job_id_idx ON reel_production_plans(content_job_id);
CREATE INDEX IF NOT EXISTS reel_production_plans_brand_id_idx ON reel_production_plans(brand_id);
CREATE INDEX IF NOT EXISTS reel_production_plans_campaign_id_idx ON reel_production_plans(campaign_id);
CREATE INDEX IF NOT EXISTS reel_production_plans_plan_id_idx ON reel_production_plans(content_plan_id);
CREATE INDEX IF NOT EXISTS reel_production_plans_workspace_id_idx ON reel_production_plans(workspace_id);
CREATE INDEX IF NOT EXISTS reel_production_plans_status_idx ON reel_production_plans(status);
CREATE UNIQUE INDEX IF NOT EXISTS reel_production_plans_job_version_idx ON reel_production_plans(content_job_id, version);
