-- ====================================================
-- VIDSNAPAI — MIGRATION 0007: PHASES 09 TO 13
-- Social Publications, Meta Ads, Performance Intelligence,
-- Optimization Engine, and Autonomous Operations
-- ====================================================

-- ----------------------------------------------------
-- Phase 9: Social Publications
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "social_publications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reel_plan_id" UUID NOT NULL REFERENCES "reel_production_plans"("id") ON DELETE CASCADE,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "platform" VARCHAR(50) NOT NULL DEFAULT 'INSTAGRAM',
  "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  "scheduled_at" TIMESTAMP WITH TIME ZONE,
  "published_at" TIMESTAMP WITH TIME ZONE,
  "external_post_id" VARCHAR(255),
  "external_url" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "error_code" VARCHAR(100),
  "error_message" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "social_publications_workspace_id_idx" ON "social_publications"("workspace_id");
CREATE INDEX IF NOT EXISTS "social_publications_brand_id_idx" ON "social_publications"("brand_id");
CREATE INDEX IF NOT EXISTS "social_publications_reel_plan_id_idx" ON "social_publications"("reel_plan_id");
CREATE INDEX IF NOT EXISTS "social_publications_status_idx" ON "social_publications"("status");
CREATE INDEX IF NOT EXISTS "social_publications_platform_idx" ON "social_publications"("platform");

-- ----------------------------------------------------
-- Phase 10: Meta Ads Integration Tables
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "meta_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "meta_user_id" VARCHAR(255) NOT NULL,
  "meta_user_name" VARCHAR(255) NOT NULL,
  "access_token" TEXT,
  "token_expires_at" TIMESTAMP WITH TIME ZONE,
  "ad_accounts" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "pages" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "selected_ad_account_id" VARCHAR(255),
  "selected_page_id" VARCHAR(255),
  "selected_instagram_actor_id" VARCHAR(255),
  "status" VARCHAR(50) NOT NULL DEFAULT 'CONNECTED',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "meta_connections_workspace_unique_idx" ON "meta_connections"("workspace_id");
CREATE INDEX IF NOT EXISTS "meta_connections_workspace_id_idx" ON "meta_connections"("workspace_id");
CREATE INDEX IF NOT EXISTS "meta_connections_status_idx" ON "meta_connections"("status");

CREATE TABLE IF NOT EXISTS "meta_ad_campaigns" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "campaign_id" UUID REFERENCES "campaigns"("id") ON DELETE SET NULL,
  "meta_ad_account_id" VARCHAR(255) NOT NULL,
  "external_campaign_id" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "objective" VARCHAR(100) NOT NULL,
  "buying_type" VARCHAR(50) NOT NULL DEFAULT 'AUCTION',
  "status" VARCHAR(50) NOT NULL DEFAULT 'PAUSED',
  "daily_budget" INTEGER,
  "lifetime_budget" INTEGER,
  "special_ad_categories" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "meta_ad_campaigns_workspace_id_idx" ON "meta_ad_campaigns"("workspace_id");
CREATE INDEX IF NOT EXISTS "meta_ad_campaigns_brand_id_idx" ON "meta_ad_campaigns"("brand_id");
CREATE INDEX IF NOT EXISTS "meta_ad_campaigns_campaign_id_idx" ON "meta_ad_campaigns"("campaign_id");
CREATE INDEX IF NOT EXISTS "meta_ad_campaigns_external_id_idx" ON "meta_ad_campaigns"("external_campaign_id");

CREATE TABLE IF NOT EXISTS "meta_ad_sets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "meta_ad_campaign_id" UUID NOT NULL REFERENCES "meta_ad_campaigns"("id") ON DELETE CASCADE,
  "external_ad_set_id" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'PAUSED',
  "billing_event" VARCHAR(50) NOT NULL DEFAULT 'IMPRESSIONS',
  "optimization_goal" VARCHAR(50) NOT NULL DEFAULT 'LINK_CLICKS',
  "daily_budget" INTEGER,
  "lifetime_budget" INTEGER,
  "targeting" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "start_time" TIMESTAMP WITH TIME ZONE,
  "end_time" TIMESTAMP WITH TIME ZONE,
  "promoted_object" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "bid_amount" INTEGER,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "meta_ad_sets_workspace_id_idx" ON "meta_ad_sets"("workspace_id");
CREATE INDEX IF NOT EXISTS "meta_ad_sets_campaign_id_idx" ON "meta_ad_sets"("meta_ad_campaign_id");
CREATE INDEX IF NOT EXISTS "meta_ad_sets_external_id_idx" ON "meta_ad_sets"("external_ad_set_id");

CREATE TABLE IF NOT EXISTS "meta_ad_creatives" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "reel_plan_id" UUID NOT NULL REFERENCES "reel_production_plans"("id") ON DELETE CASCADE,
  "external_creative_id" VARCHAR(255) NOT NULL,
  "external_video_id" VARCHAR(255),
  "name" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "body" TEXT NOT NULL,
  "video_url" TEXT NOT NULL,
  "thumbnail_url" TEXT,
  "call_to_action_type" VARCHAR(50) NOT NULL DEFAULT 'LEARN_MORE',
  "destination_url" TEXT NOT NULL,
  "link_caption" VARCHAR(255),
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "meta_ad_creatives_workspace_id_idx" ON "meta_ad_creatives"("workspace_id");
CREATE INDEX IF NOT EXISTS "meta_ad_creatives_brand_id_idx" ON "meta_ad_creatives"("brand_id");
CREATE INDEX IF NOT EXISTS "meta_ad_creatives_reel_plan_id_idx" ON "meta_ad_creatives"("reel_plan_id");
CREATE INDEX IF NOT EXISTS "meta_ad_creatives_external_id_idx" ON "meta_ad_creatives"("external_creative_id");

CREATE TABLE IF NOT EXISTS "meta_ads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "meta_ad_set_id" UUID NOT NULL REFERENCES "meta_ad_sets"("id") ON DELETE CASCADE,
  "meta_ad_creative_id" UUID NOT NULL REFERENCES "meta_ad_creatives"("id") ON DELETE CASCADE,
  "reel_plan_id" UUID NOT NULL REFERENCES "reel_production_plans"("id") ON DELETE CASCADE,
  "external_ad_id" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'PAUSED',
  "tracking_specs" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "meta_ads_workspace_id_idx" ON "meta_ads"("workspace_id");
CREATE INDEX IF NOT EXISTS "meta_ads_ad_set_id_idx" ON "meta_ads"("meta_ad_set_id");
CREATE INDEX IF NOT EXISTS "meta_ads_creative_id_idx" ON "meta_ads"("meta_ad_creative_id");
CREATE INDEX IF NOT EXISTS "meta_ads_reel_plan_id_idx" ON "meta_ads"("reel_plan_id");
CREATE INDEX IF NOT EXISTS "meta_ads_external_id_idx" ON "meta_ads"("external_ad_id");

CREATE TABLE IF NOT EXISTS "meta_ad_publications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "reel_plan_id" UUID NOT NULL REFERENCES "reel_production_plans"("id") ON DELETE CASCADE,
  "meta_campaign_id" UUID REFERENCES "meta_ad_campaigns"("id") ON DELETE SET NULL,
  "meta_ad_set_id" UUID REFERENCES "meta_ad_sets"("id") ON DELETE SET NULL,
  "meta_creative_id" UUID REFERENCES "meta_ad_creatives"("id") ON DELETE SET NULL,
  "meta_ad_id" UUID REFERENCES "meta_ads"("id") ON DELETE SET NULL,
  "external_campaign_id" VARCHAR(255),
  "external_ad_set_id" VARCHAR(255),
  "external_creative_id" VARCHAR(255),
  "external_ad_id" VARCHAR(255),
  "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  "idempotency_key" VARCHAR(255) NOT NULL,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "error_code" VARCHAR(100),
  "error_message" TEXT,
  "published_at" TIMESTAMP WITH TIME ZONE,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "meta_ad_pub_idempotency_idx" ON "meta_ad_publications"("idempotency_key");
CREATE INDEX IF NOT EXISTS "meta_ad_publications_workspace_id_idx" ON "meta_ad_publications"("workspace_id");
CREATE INDEX IF NOT EXISTS "meta_ad_publications_brand_id_idx" ON "meta_ad_publications"("brand_id");
CREATE INDEX IF NOT EXISTS "meta_ad_publications_reel_plan_id_idx" ON "meta_ad_publications"("reel_plan_id");
CREATE INDEX IF NOT EXISTS "meta_ad_publications_status_idx" ON "meta_ad_publications"("status");

-- ----------------------------------------------------
-- Phase 11: Analytics & Performance Intelligence
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "performance_snapshots" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "marketing_campaign_id" UUID REFERENCES "campaigns"("id") ON DELETE SET NULL,
  "reel_id" UUID REFERENCES "reel_production_plans"("id") ON DELETE SET NULL,
  "publication_id" UUID,
  "platform" VARCHAR(50) NOT NULL DEFAULT 'META',
  "external_campaign_id" VARCHAR(255),
  "external_ad_set_id" VARCHAR(255),
  "external_ad_id" VARCHAR(255),
  "external_post_id" VARCHAR(255),
  "collected_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "reporting_window_start" TIMESTAMP WITH TIME ZONE,
  "reporting_window_end" TIMESTAMP WITH TIME ZONE,
  "impressions" INTEGER,
  "reach" INTEGER,
  "video_views" INTEGER,
  "video_views_3s" INTEGER,
  "video_views_thruplay" INTEGER,
  "watch_time_seconds" REAL,
  "average_watch_time_seconds" REAL,
  "completion_rate" REAL,
  "likes" INTEGER,
  "comments" INTEGER,
  "shares" INTEGER,
  "saves" INTEGER,
  "clicks" INTEGER,
  "link_clicks" INTEGER,
  "ctr" REAL,
  "cpc" REAL,
  "cpm" REAL,
  "spend" REAL,
  "conversions" INTEGER,
  "conversion_value" REAL,
  "purchases" INTEGER,
  "revenue" REAL,
  "raw_payload" JSONB,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "perf_snapshots_workspace_id_idx" ON "performance_snapshots"("workspace_id");
CREATE INDEX IF NOT EXISTS "perf_snapshots_brand_id_idx" ON "performance_snapshots"("brand_id");
CREATE INDEX IF NOT EXISTS "perf_snapshots_reel_id_idx" ON "performance_snapshots"("reel_id");
CREATE INDEX IF NOT EXISTS "perf_snapshots_campaign_id_idx" ON "performance_snapshots"("marketing_campaign_id");
CREATE INDEX IF NOT EXISTS "perf_snapshots_platform_idx" ON "performance_snapshots"("platform");
CREATE INDEX IF NOT EXISTS "perf_snapshots_collected_at_idx" ON "performance_snapshots"("collected_at");
CREATE INDEX IF NOT EXISTS "perf_snapshots_ext_ad_idx" ON "performance_snapshots"("external_ad_id");

CREATE TABLE IF NOT EXISTS "performance_metric_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "reel_id" UUID REFERENCES "reel_production_plans"("id") ON DELETE SET NULL,
  "external_campaign_id" VARCHAR(255),
  "external_ad_set_id" VARCHAR(255),
  "external_ad_id" VARCHAR(255),
  "platform" VARCHAR(50) NOT NULL DEFAULT 'META',
  "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "metric_payload" JSONB NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "perf_history_workspace_id_idx" ON "performance_metric_history"("workspace_id");
CREATE INDEX IF NOT EXISTS "perf_history_brand_id_idx" ON "performance_metric_history"("brand_id");
CREATE INDEX IF NOT EXISTS "perf_history_reel_id_idx" ON "performance_metric_history"("reel_id");
CREATE INDEX IF NOT EXISTS "perf_history_timestamp_idx" ON "performance_metric_history"("timestamp");

CREATE TABLE IF NOT EXISTS "content_performance_analysis" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "reel_id" UUID NOT NULL REFERENCES "reel_production_plans"("id") ON DELETE CASCADE,
  "analyzed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "performance_tier" VARCHAR(50) NOT NULL,
  "hook_score" REAL NOT NULL,
  "retention_score" REAL NOT NULL,
  "engagement_score" REAL NOT NULL,
  "conversion_score" REAL NOT NULL,
  "overall_score" REAL NOT NULL,
  "strengths" JSONB DEFAULT '[]'::jsonb,
  "weaknesses" JSONB DEFAULT '[]'::jsonb,
  "detected_patterns" JSONB DEFAULT '{}'::jsonb,
  "metric_summary" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "content_perf_analysis_workspace_id_idx" ON "content_performance_analysis"("workspace_id");
CREATE INDEX IF NOT EXISTS "content_perf_analysis_brand_id_idx" ON "content_performance_analysis"("brand_id");
CREATE INDEX IF NOT EXISTS "content_perf_analysis_reel_id_idx" ON "content_performance_analysis"("reel_id");
CREATE INDEX IF NOT EXISTS "content_perf_analysis_tier_idx" ON "content_performance_analysis"("performance_tier");

-- ----------------------------------------------------
-- Phase 12: Optimization & Learning Engine Tables
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "optimization_insights" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "source_reel_id" UUID REFERENCES "reel_production_plans"("id") ON DELETE SET NULL,
  "source_campaign_id" UUID REFERENCES "campaigns"("id") ON DELETE SET NULL,
  "type" VARCHAR(50) NOT NULL,
  "priority" VARCHAR(20) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "recommendation" TEXT NOT NULL,
  "reasoning" TEXT NOT NULL,
  "evidence" JSONB DEFAULT '{}'::jsonb,
  "expected_impact" VARCHAR(255) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "opt_insights_workspace_id_idx" ON "optimization_insights"("workspace_id");
CREATE INDEX IF NOT EXISTS "opt_insights_brand_id_idx" ON "optimization_insights"("brand_id");
CREATE INDEX IF NOT EXISTS "opt_insights_type_idx" ON "optimization_insights"("type");
CREATE INDEX IF NOT EXISTS "opt_insights_status_idx" ON "optimization_insights"("status");
CREATE INDEX IF NOT EXISTS "opt_insights_priority_idx" ON "optimization_insights"("priority");

CREATE TABLE IF NOT EXISTS "optimization_learning" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "pattern_type" VARCHAR(50) NOT NULL,
  "pattern_key" VARCHAR(255) NOT NULL,
  "sample_size" INTEGER NOT NULL DEFAULT 1,
  "confidence_score" REAL NOT NULL DEFAULT 0.8,
  "summary" TEXT NOT NULL,
  "evidence_references" JSONB DEFAULT '[]'::jsonb,
  "recommendations" JSONB DEFAULT '[]'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "opt_learning_workspace_id_idx" ON "optimization_learning"("workspace_id");
CREATE INDEX IF NOT EXISTS "opt_learning_brand_id_idx" ON "optimization_learning"("brand_id");
CREATE INDEX IF NOT EXISTS "opt_learning_pattern_type_idx" ON "optimization_learning"("pattern_type");

CREATE TABLE IF NOT EXISTS "experiments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "experiment_type" VARCHAR(50) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
  "variant_a" JSONB NOT NULL,
  "variant_b" JSONB NOT NULL,
  "target_metric" VARCHAR(100) NOT NULL DEFAULT 'conversionRate',
  "sample_size_a" INTEGER NOT NULL DEFAULT 0,
  "sample_size_b" INTEGER NOT NULL DEFAULT 0,
  "confidence_score" REAL,
  "winning_variant" VARCHAR(20),
  "result_summary" TEXT,
  "started_at" TIMESTAMP WITH TIME ZONE,
  "ended_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "experiments_workspace_id_idx" ON "experiments"("workspace_id");
CREATE INDEX IF NOT EXISTS "experiments_brand_id_idx" ON "experiments"("brand_id");
CREATE INDEX IF NOT EXISTS "experiments_status_idx" ON "experiments"("status");

CREATE TABLE IF NOT EXISTS "optimization_actions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "campaign_id" UUID REFERENCES "campaigns"("id") ON DELETE SET NULL,
  "reel_id" UUID REFERENCES "reel_production_plans"("id") ON DELETE SET NULL,
  "action_type" VARCHAR(100) NOT NULL,
  "target_entity" VARCHAR(255) NOT NULL,
  "reason" TEXT NOT NULL,
  "evidence" TEXT NOT NULL,
  "confidence" REAL NOT NULL DEFAULT 0.85,
  "expected_impact" VARCHAR(255) NOT NULL,
  "source_metrics" JSONB DEFAULT '{}'::jsonb,
  "status" VARCHAR(50) NOT NULL DEFAULT 'PROPOSED',
  "applied_at" TIMESTAMP WITH TIME ZONE,
  "metadata" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "opt_actions_workspace_id_idx" ON "optimization_actions"("workspace_id");
CREATE INDEX IF NOT EXISTS "opt_actions_brand_id_idx" ON "optimization_actions"("brand_id");
CREATE INDEX IF NOT EXISTS "opt_actions_campaign_id_idx" ON "optimization_actions"("campaign_id");
CREATE INDEX IF NOT EXISTS "opt_actions_reel_id_idx" ON "optimization_actions"("reel_id");
CREATE INDEX IF NOT EXISTS "opt_actions_status_idx" ON "optimization_actions"("status");
CREATE INDEX IF NOT EXISTS "opt_actions_type_idx" ON "optimization_actions"("action_type");

CREATE TABLE IF NOT EXISTS "optimization_execution_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "action_id" UUID NOT NULL REFERENCES "optimization_actions"("id") ON DELETE CASCADE,
  "executed_by" VARCHAR(100) NOT NULL DEFAULT 'SYSTEM',
  "execution_status" VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
  "execution_result" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "opt_exec_history_workspace_id_idx" ON "optimization_execution_history"("workspace_id");
CREATE INDEX IF NOT EXISTS "opt_exec_history_brand_id_idx" ON "optimization_execution_history"("brand_id");
CREATE INDEX IF NOT EXISTS "opt_exec_history_action_id_idx" ON "optimization_execution_history"("action_id");
CREATE INDEX IF NOT EXISTS "opt_exec_history_status_idx" ON "optimization_execution_history"("execution_status");

CREATE TABLE IF NOT EXISTS "campaign_director_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "campaign_id" UUID REFERENCES "campaigns"("id") ON DELETE SET NULL,
  "summary" TEXT NOT NULL,
  "winning_patterns" JSONB DEFAULT '[]'::jsonb,
  "weak_patterns" JSONB DEFAULT '[]'::jsonb,
  "strategic_directives" JSONB DEFAULT '[]'::jsonb,
  "content_requirements" JSONB DEFAULT '[]'::jsonb,
  "proposed_action_ids" JSONB DEFAULT '[]'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "campaign_director_runs_workspace_id_idx" ON "campaign_director_runs"("workspace_id");
CREATE INDEX IF NOT EXISTS "campaign_director_runs_brand_id_idx" ON "campaign_director_runs"("brand_id");
CREATE INDEX IF NOT EXISTS "campaign_director_runs_campaign_id_idx" ON "campaign_director_runs"("campaign_id");

-- ----------------------------------------------------
-- Phase 13: Autonomous Operations Engine Tables
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS "autonomous_policies" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL UNIQUE REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "mode" VARCHAR(50) NOT NULL DEFAULT 'CONTROLLED',
  "status" VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  "advertising" JSONB NOT NULL DEFAULT '{"enabled":true,"maxDailySpend":50,"maxCampaignSpend":250,"maxCampaignsPerDay":3,"maxNewAdsPerDay":10}'::jsonb,
  "content" JSONB NOT NULL DEFAULT '{"maxReelsPerDay":10,"maxReelsPerCampaign":30}'::jsonb,
  "optimization" JSONB NOT NULL DEFAULT '{"autoApply":true,"allowedActions":["CHANGE_HOOK","CHANGE_MESSAGING_ANGLE","CHANGE_CTA","CHANGE_CONTENT_PILLAR","CHANGE_DURATION","CHANGE_VISUAL_STYLE","CREATE_VARIANT","REPLACE_CREATIVE","PAUSE_RECOMMENDATION"]}'::jsonb,
  "targeting" JSONB NOT NULL DEFAULT '{"allowedCountries":[],"allowedAgeRange":{},"allowedPlacements":[]}'::jsonb,
  "brand" JSONB NOT NULL DEFAULT '{"enforceBrandRules":true,"enforceBrandColors":true,"enforceApprovedAssets":true}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "autonomous_policies_workspace_id_idx" ON "autonomous_policies"("workspace_id");
CREATE INDEX IF NOT EXISTS "autonomous_policies_mode_idx" ON "autonomous_policies"("mode");
CREATE INDEX IF NOT EXISTS "autonomous_policies_status_idx" ON "autonomous_policies"("status");

CREATE TABLE IF NOT EXISTS "autonomous_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "campaign_id" UUID REFERENCES "campaigns"("id") ON DELETE SET NULL,
  "trigger_type" VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  "current_step" VARCHAR(100),
  "policy_snapshot" JSONB,
  "summary" TEXT,
  "details" JSONB DEFAULT '{}'::jsonb,
  "error" TEXT,
  "idempotency_key" VARCHAR(255),
  "started_at" TIMESTAMP WITH TIME ZONE,
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "autonomous_runs_workspace_id_idx" ON "autonomous_runs"("workspace_id");
CREATE INDEX IF NOT EXISTS "autonomous_runs_brand_id_idx" ON "autonomous_runs"("brand_id");
CREATE INDEX IF NOT EXISTS "autonomous_runs_campaign_id_idx" ON "autonomous_runs"("campaign_id");
CREATE INDEX IF NOT EXISTS "autonomous_runs_status_idx" ON "autonomous_runs"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "autonomous_runs_idempotency_key_idx" ON "autonomous_runs"("idempotency_key");

CREATE TABLE IF NOT EXISTS "autonomous_run_steps" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id" UUID NOT NULL REFERENCES "autonomous_runs"("id") ON DELETE CASCADE,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "step_name" VARCHAR(100) NOT NULL,
  "status" VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  "input_payload" JSONB DEFAULT '{}'::jsonb,
  "output_payload" JSONB DEFAULT '{}'::jsonb,
  "error_message" TEXT,
  "started_at" TIMESTAMP WITH TIME ZONE,
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "autonomous_run_steps_run_id_idx" ON "autonomous_run_steps"("run_id");
CREATE INDEX IF NOT EXISTS "autonomous_run_steps_workspace_id_idx" ON "autonomous_run_steps"("workspace_id");
CREATE INDEX IF NOT EXISTS "autonomous_run_steps_step_name_idx" ON "autonomous_run_steps"("step_name");
CREATE INDEX IF NOT EXISTS "autonomous_run_steps_status_idx" ON "autonomous_run_steps"("status");

CREATE TABLE IF NOT EXISTS "autonomous_execution_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "run_id" UUID REFERENCES "autonomous_runs"("id") ON DELETE SET NULL,
  "action_type" VARCHAR(100) NOT NULL,
  "target_entity" VARCHAR(100) NOT NULL,
  "target_id" VARCHAR(255),
  "status" VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
  "reason" TEXT NOT NULL,
  "budget_impact" REAL NOT NULL DEFAULT 0,
  "execution_result" JSONB DEFAULT '{}'::jsonb,
  "error_information" TEXT,
  "idempotency_key" VARCHAR(255),
  "executed_by" VARCHAR(100) NOT NULL DEFAULT 'AUTONOMOUS_ENGINE',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "auton_exec_history_workspace_id_idx" ON "autonomous_execution_history"("workspace_id");
CREATE INDEX IF NOT EXISTS "auton_exec_history_brand_id_idx" ON "autonomous_execution_history"("brand_id");
CREATE INDEX IF NOT EXISTS "auton_exec_history_run_id_idx" ON "autonomous_execution_history"("run_id");
CREATE INDEX IF NOT EXISTS "auton_exec_history_action_type_idx" ON "autonomous_execution_history"("action_type");
CREATE INDEX IF NOT EXISTS "auton_exec_history_status_idx" ON "autonomous_execution_history"("status");

CREATE TABLE IF NOT EXISTS "autonomous_limits" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "date" VARCHAR(20) NOT NULL,
  "daily_spend" REAL NOT NULL DEFAULT 0,
  "campaigns_created" INTEGER NOT NULL DEFAULT 0,
  "ads_created" INTEGER NOT NULL DEFAULT 0,
  "reels_created" INTEGER NOT NULL DEFAULT 0,
  "reels_rendered" INTEGER NOT NULL DEFAULT 0,
  "reels_published" INTEGER NOT NULL DEFAULT 0,
  "optimizations_applied" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "auton_limits_ws_date_idx" ON "autonomous_limits"("workspace_id", "date");
CREATE INDEX IF NOT EXISTS "auton_limits_workspace_id_idx" ON "autonomous_limits"("workspace_id");
CREATE INDEX IF NOT EXISTS "auton_limits_date_idx" ON "autonomous_limits"("date");

CREATE TABLE IF NOT EXISTS "autonomous_budget_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "event_type" VARCHAR(100) NOT NULL,
  "amount" REAL NOT NULL DEFAULT 0,
  "limit_value" REAL NOT NULL DEFAULT 0,
  "current_value" REAL NOT NULL DEFAULT 0,
  "reason" TEXT NOT NULL,
  "metadata" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "auton_budget_events_workspace_id_idx" ON "autonomous_budget_events"("workspace_id");
CREATE INDEX IF NOT EXISTS "auton_budget_events_brand_id_idx" ON "autonomous_budget_events"("brand_id");
CREATE INDEX IF NOT EXISTS "auton_budget_events_event_type_idx" ON "autonomous_budget_events"("event_type");

CREATE TABLE IF NOT EXISTS "autonomous_safety_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID REFERENCES "brands"("id") ON DELETE SET NULL,
  "event_type" VARCHAR(100) NOT NULL,
  "severity" VARCHAR(50) NOT NULL DEFAULT 'WARNING',
  "description" TEXT NOT NULL,
  "blocked_action" VARCHAR(100),
  "details" JSONB DEFAULT '{}'::jsonb,
  "resolved" VARCHAR(10) NOT NULL DEFAULT 'NO',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "auton_safety_events_workspace_id_idx" ON "autonomous_safety_events"("workspace_id");
CREATE INDEX IF NOT EXISTS "auton_safety_events_brand_id_idx" ON "autonomous_safety_events"("brand_id");
CREATE INDEX IF NOT EXISTS "auton_safety_events_event_type_idx" ON "autonomous_safety_events"("event_type");
CREATE INDEX IF NOT EXISTS "auton_safety_events_severity_idx" ON "autonomous_safety_events"("severity");
