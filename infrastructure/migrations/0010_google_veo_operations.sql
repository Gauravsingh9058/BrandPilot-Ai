-- VidSnapAI: Google Veo 3.1 AI Video Generation Operations Table & Metadata Persistence

CREATE TABLE IF NOT EXISTS ai_video_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'google-veo',
  model VARCHAR(100) NOT NULL DEFAULT 'veo-3.1-generate-preview',
  operation_id VARCHAR(255) NOT NULL UNIQUE,
  reel_plan_id UUID,
  scene_number INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED | POLLING | COMPLETED | FAILED
  prompt TEXT NOT NULL,
  reference_asset_ids JSONB DEFAULT '[]'::jsonb,
  output_storage_key TEXT,
  output_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  error JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS ai_video_operations_operation_id_idx ON ai_video_operations(operation_id);
CREATE INDEX IF NOT EXISTS ai_video_operations_status_idx ON ai_video_operations(status);
CREATE INDEX IF NOT EXISTS ai_video_operations_reel_plan_id_idx ON ai_video_operations(reel_plan_id);
CREATE INDEX IF NOT EXISTS ai_video_operations_workspace_id_idx ON ai_video_operations(workspace_id);
