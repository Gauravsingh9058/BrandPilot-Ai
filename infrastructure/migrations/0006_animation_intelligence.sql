-- Migration: 0006_animation_intelligence.sql
-- Description: Phase 7 Advanced Animation Intelligence Engine tables

CREATE TABLE IF NOT EXISTS animation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  reel_plan_id UUID NOT NULL REFERENCES reel_production_plans(id) ON DELETE CASCADE,
  production_package_id UUID NOT NULL REFERENCES reel_production_packages(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'READY',
  animation_language VARCHAR(50) NOT NULL,
  global_settings JSONB NOT NULL DEFAULT '{}',
  scene_animations JSONB NOT NULL DEFAULT '[]',
  transition_plan JSONB NOT NULL DEFAULT '[]',
  text_animation_plan JSONB NOT NULL DEFAULT '[]',
  camera_plan JSONB NOT NULL DEFAULT '[]',
  product_animation_plan JSONB NOT NULL DEFAULT '[]',
  logo_animation_plan JSONB NOT NULL DEFAULT '[]',
  sync_plan JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT animation_plans_reel_version_unique_idx UNIQUE (reel_plan_id, version)
);

CREATE INDEX IF NOT EXISTS animation_plans_workspace_id_idx ON animation_plans(workspace_id);
CREATE INDEX IF NOT EXISTS animation_plans_brand_id_idx ON animation_plans(brand_id);
CREATE INDEX IF NOT EXISTS animation_plans_reel_plan_id_idx ON animation_plans(reel_plan_id);
CREATE INDEX IF NOT EXISTS animation_plans_package_id_idx ON animation_plans(production_package_id);
CREATE INDEX IF NOT EXISTS animation_plans_status_idx ON animation_plans(status);
