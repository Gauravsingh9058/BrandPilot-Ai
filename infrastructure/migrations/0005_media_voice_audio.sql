-- ====================================================
-- VIDSNAPAI — MIGRATION 0005: MEDIA + VOICE + CAPTIONS + AUDIO
-- Phase 6: Production Asset Package & Intelligence Tables
-- ====================================================

-- 1. Reel Assets Table (Manifest of resolved & uploaded media/audio/voice assets)
CREATE TABLE IF NOT EXISTS "reel_assets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reel_plan_id" UUID NOT NULL REFERENCES "reel_production_plans"("id") ON DELETE CASCADE,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "scene_number" INTEGER,
  "asset_type" VARCHAR(50) NOT NULL, -- VIDEO, IMAGE, LOGO, PRODUCT_IMAGE, PRODUCT_VIDEO, MUSIC, SFX, VOICE, CAPTION
  "source_type" VARCHAR(50) NOT NULL, -- BRAND_LIBRARY, PEXELS, LOCAL_GALLERY, GENERATED, EXTERNAL
  "provider" VARCHAR(100) NOT NULL, -- 'pexels', 'brand_library', 'local_gallery', 'ai_gemini', 'elevenlabs', 'mock_voice', etc.
  "provider_asset_id" VARCHAR(255),
  "source_url" VARCHAR(2000),
  "preview_url" VARCHAR(2000),
  "storage_key" VARCHAR(500),
  "filename" VARCHAR(255),
  "mime_type" VARCHAR(100),
  "width" INTEGER,
  "height" INTEGER,
  "duration_seconds" REAL,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "license_metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "status" VARCHAR(50) NOT NULL DEFAULT 'READY', -- DISCOVERED, SELECTED, DOWNLOADING, READY, FAILED, REJECTED
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "reel_assets_reel_plan_id_idx" ON "reel_assets"("reel_plan_id");
CREATE INDEX IF NOT EXISTS "reel_assets_workspace_id_idx" ON "reel_assets"("workspace_id");
CREATE INDEX IF NOT EXISTS "reel_assets_brand_id_idx" ON "reel_assets"("brand_id");
CREATE INDEX IF NOT EXISTS "reel_assets_asset_type_idx" ON "reel_assets"("asset_type");
CREATE INDEX IF NOT EXISTS "reel_assets_status_idx" ON "reel_assets"("status");
CREATE INDEX IF NOT EXISTS "reel_assets_scene_number_idx" ON "reel_assets"("scene_number");

-- 2. Caption Tracks Table (Timed Cues and Visual Styling for Reel narration)
CREATE TABLE IF NOT EXISTS "caption_tracks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reel_plan_id" UUID NOT NULL REFERENCES "reel_production_plans"("id") ON DELETE CASCADE,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "version" INTEGER NOT NULL DEFAULT 1,
  "cues" JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of CaptionCue
  "style" JSONB NOT NULL DEFAULT '{}'::jsonb, -- CaptionStyleConfig
  "status" VARCHAR(50) NOT NULL DEFAULT 'READY', -- DRAFT, READY, FAILED
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "caption_tracks_reel_plan_id_idx" ON "caption_tracks"("reel_plan_id");
CREATE INDEX IF NOT EXISTS "caption_tracks_workspace_id_idx" ON "caption_tracks"("workspace_id");
CREATE INDEX IF NOT EXISTS "caption_tracks_brand_id_idx" ON "caption_tracks"("brand_id");
CREATE UNIQUE INDEX IF NOT EXISTS "caption_tracks_reel_version_idx" ON "caption_tracks"("reel_plan_id", "version");

-- 3. Audio Mix Plans Table (Voice, Music, SFX configuration & Ducking hierarchy)
CREATE TABLE IF NOT EXISTS "audio_mix_plans" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reel_plan_id" UUID NOT NULL REFERENCES "reel_production_plans"("id") ON DELETE CASCADE,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "voice_config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "music_config" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "sfx_configs" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "mix_settings" JSONB NOT NULL DEFAULT '{}'::jsonb, -- volume balances, ducking priority (VOICE > SFX > MUSIC), fades
  "status" VARCHAR(50) NOT NULL DEFAULT 'READY', -- READY, PENDING, FAILED
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "audio_mix_plans_reel_plan_id_idx" ON "audio_mix_plans"("reel_plan_id");
CREATE INDEX IF NOT EXISTS "audio_mix_plans_workspace_id_idx" ON "audio_mix_plans"("workspace_id");
CREATE INDEX IF NOT EXISTS "audio_mix_plans_brand_id_idx" ON "audio_mix_plans"("brand_id");

-- 4. Reel Production Packages Table (Combined asset manifest & Readiness verification for Phase 7/8 handoff)
CREATE TABLE IF NOT EXISTS "reel_production_packages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reel_plan_id" UUID NOT NULL REFERENCES "reel_production_plans"("id") ON DELETE CASCADE,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "brand_id" UUID NOT NULL REFERENCES "brands"("id") ON DELETE CASCADE,
  "readiness" JSONB NOT NULL DEFAULT '{}'::jsonb, -- { status: 'READY_FOR_ANIMATION', checks: {...}, blockers: [] }
  "package_payload" JSONB NOT NULL DEFAULT '{}'::jsonb, -- Complete compiled blueprint + assets + voice + captions + audio
  "status" VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, READY, BLOCKED
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "reel_production_packages_reel_plan_id_idx" ON "reel_production_packages"("reel_plan_id");
CREATE INDEX IF NOT EXISTS "reel_production_packages_workspace_id_idx" ON "reel_production_packages"("workspace_id");
CREATE INDEX IF NOT EXISTS "reel_production_packages_brand_id_idx" ON "reel_production_packages"("brand_id");
CREATE INDEX IF NOT EXISTS "reel_production_packages_status_idx" ON "reel_production_packages"("status");
