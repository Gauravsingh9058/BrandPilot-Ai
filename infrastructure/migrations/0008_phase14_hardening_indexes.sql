-- VidSnapAI Phase 14: Production Hardening Indexes & Constraints

-- Workspaces & Members
CREATE INDEX IF NOT EXISTS workspaces_owner_id_idx ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS workspace_members_user_workspace_idx ON workspace_members(user_id, workspace_id);
CREATE INDEX IF NOT EXISTS workspace_members_workspace_role_idx ON workspace_members(workspace_id, role);

-- Brands & DNA
CREATE INDEX IF NOT EXISTS brands_workspace_id_idx ON brands(workspace_id);
CREATE INDEX IF NOT EXISTS brand_dna_brand_id_idx ON brand_dna(brand_id);
CREATE INDEX IF NOT EXISTS brand_products_brand_id_idx ON brand_products(brand_id);
CREATE INDEX IF NOT EXISTS brand_assets_brand_id_idx ON brand_assets(brand_id);

-- Campaigns & Strategy
CREATE INDEX IF NOT EXISTS campaigns_brand_id_idx ON campaigns(brand_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);
CREATE INDEX IF NOT EXISTS marketing_strategies_brand_id_idx ON marketing_strategies(brand_id);

-- Content Plans & Jobs
CREATE INDEX IF NOT EXISTS content_plans_brand_id_idx ON content_plans(brand_id);
CREATE INDEX IF NOT EXISTS content_plans_workspace_id_idx ON content_plans(workspace_id);
CREATE INDEX IF NOT EXISTS content_plans_status_idx ON content_plans(status);
CREATE INDEX IF NOT EXISTS content_jobs_plan_id_idx ON content_jobs(content_plan_id);
CREATE INDEX IF NOT EXISTS content_jobs_status_idx ON content_jobs(status);
CREATE INDEX IF NOT EXISTS content_jobs_day_idx ON content_jobs(day_number);

-- Reel Production Plans & Assets
CREATE INDEX IF NOT EXISTS reel_production_plans_workspace_id_idx ON reel_production_plans(workspace_id);
CREATE INDEX IF NOT EXISTS reel_production_plans_brand_id_idx ON reel_production_plans(brand_id);
CREATE INDEX IF NOT EXISTS reel_production_plans_job_id_idx ON reel_production_plans(content_job_id);
CREATE INDEX IF NOT EXISTS reel_production_plans_plan_id_idx ON reel_production_plans(content_plan_id);
CREATE INDEX IF NOT EXISTS reel_production_plans_status_idx ON reel_production_plans(status);
CREATE INDEX IF NOT EXISTS reel_assets_reel_plan_id_idx ON reel_assets(reel_plan_id);
CREATE INDEX IF NOT EXISTS reel_assets_workspace_id_idx ON reel_assets(workspace_id);
CREATE INDEX IF NOT EXISTS reel_assets_scene_idx ON reel_assets(scene_number);

-- Animation Plans & Contracts
CREATE INDEX IF NOT EXISTS animation_plans_reel_plan_id_idx ON animation_plans(reel_plan_id);
CREATE INDEX IF NOT EXISTS animation_plans_workspace_id_idx ON animation_plans(workspace_id);

-- Meta Connections, Campaigns & Ads
CREATE INDEX IF NOT EXISTS meta_connections_workspace_id_idx ON meta_connections(workspace_id);
CREATE INDEX IF NOT EXISTS meta_ad_campaigns_workspace_id_idx ON meta_ad_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS meta_ad_campaigns_status_idx ON meta_ad_campaigns(status);
CREATE INDEX IF NOT EXISTS meta_ad_sets_campaign_id_idx ON meta_ad_sets(meta_ad_campaign_id);
CREATE INDEX IF NOT EXISTS meta_ads_ad_set_id_idx ON meta_ads(meta_ad_set_id);
CREATE INDEX IF NOT EXISTS meta_ads_reel_plan_id_idx ON meta_ads(reel_plan_id);

-- Analytics & Optimization
CREATE INDEX IF NOT EXISTS perf_snapshots_workspace_id_idx ON performance_snapshots(workspace_id);
CREATE INDEX IF NOT EXISTS perf_snapshots_brand_id_idx ON performance_snapshots(brand_id);
CREATE INDEX IF NOT EXISTS optimization_actions_workspace_id_idx ON optimization_actions(workspace_id);
CREATE INDEX IF NOT EXISTS optimization_actions_status_idx ON optimization_actions(status);

-- Autonomous Engine
CREATE INDEX IF NOT EXISTS autonomous_policies_workspace_id_idx ON autonomous_policies(workspace_id);
CREATE INDEX IF NOT EXISTS autonomous_runs_workspace_id_idx ON autonomous_runs(workspace_id);
CREATE INDEX IF NOT EXISTS autonomous_runs_brand_id_idx ON autonomous_runs(brand_id);
CREATE INDEX IF NOT EXISTS autonomous_runs_status_idx ON autonomous_runs(status);
CREATE INDEX IF NOT EXISTS auton_limits_workspace_id_idx ON autonomous_limits(workspace_id);
