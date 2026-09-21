import { Worker } from 'bullmq';
import { getWorkerRedisClient, closeWorkerRedis } from './lib/redis.js';
import { processTestJob } from './processors/test-job.processor.js';
import { processReelOrchestrationJob } from './processors/reel-orchestration.processor.js';
import { processMediaResolutionJob } from './processors/media-resolution.processor.js';
import { processVoiceGenerationJob } from './processors/voice-generation.processor.js';
import { processCaptionGenerationJob } from './processors/caption-generation.processor.js';
import { processAudioResolutionJob } from './processors/audio-resolution.processor.js';
import { processAnimationIntelligenceJob } from './processors/animation-intelligence.processor.js';
import { processVideoRenderingJob } from './processors/video-rendering.processor.js';
import { processSocialPublishingJob } from './processors/social-publishing.processor.js';
import { processBulkCampaignProductionJob } from './processors/bulk-campaign-production.processor.js';
import { processMetaAdsPublishingJob } from './processors/meta-ads-publish.processor.js';
import { processAnalyticsSyncJob } from './processors/analytics-sync.processor.js';
import { processOptimizationExecutionJob } from './processors/optimization-execution.processor.js';
import { processAutonomousCampaignJob } from './processors/autonomous-campaign.processor.js';
import type {
  TestJobPayload,
  ReelOrchestrationJobPayload,
  MediaResolutionJobPayload,
  VoiceGenerationJobPayload,
  CaptionGenerationJobPayload,
  AudioResolutionJobPayload,
  AnimationJobPayload,
  RenderJobPayload,
  SocialPublishJobPayload,
  BulkCampaignJobPayload,
  MetaAdsPublishJobPayload,
  AnalyticsSyncJobPayload,
  OptimizationExecutionJobPayload,
  AutonomousJobPayload
} from '@vidsnapai/types';

const TEST_QUEUE_NAME = 'test-queue';
const REEL_QUEUE_NAME = 'reel-orchestration';
const MEDIA_QUEUE_NAME = 'media-resolution';
const VOICE_QUEUE_NAME = 'voice-generation';
const CAPTION_QUEUE_NAME = 'caption-generation';
const AUDIO_QUEUE_NAME = 'audio-resolution';
const ANIMATION_QUEUE_NAME = 'animation-intelligence';
const RENDER_QUEUE_NAME = 'video-rendering';
const PUBLISH_QUEUE_NAME = 'social-publishing';
const BULK_CAMPAIGN_QUEUE_NAME = 'bulk-campaign-production';
const META_ADS_QUEUE_NAME = 'meta-ads-publish';
import { getConfig } from '@vidsnapai/config';
import { logAIStartupDiagnostics } from '@vidsnapai/ai';

const ANALYTICS_SYNC_QUEUE_NAME = 'analytics-sync';
const OPTIMIZATION_EXECUTION_QUEUE_NAME = 'optimization-execution';
const AUTONOMOUS_CAMPAIGN_QUEUE_NAME = 'autonomous-campaign';

const config = getConfig();
console.log(`[VidSnapAI Worker] Initializing BullMQ workers...`);
logAIStartupDiagnostics({
  apiKey: config.GEMINI_API_KEY,
  modelName: config.GEMINI_MODEL
});

const connection = getWorkerRedisClient();
const connConfig = {
  connection: connection as unknown as { host?: string; port?: number },
  concurrency: 3
};

export const testWorker = new Worker<TestJobPayload>(
  TEST_QUEUE_NAME,
  async (job) => processTestJob(job),
  { connection: connection as unknown as { host?: string; port?: number }, concurrency: 5 }
);

export const reelWorker = new Worker<ReelOrchestrationJobPayload>(
  REEL_QUEUE_NAME,
  async (job) => processReelOrchestrationJob(job),
  connConfig
);

export const mediaWorker = new Worker<MediaResolutionJobPayload>(
  MEDIA_QUEUE_NAME,
  async (job) => processMediaResolutionJob(job),
  connConfig
);

export const voiceWorker = new Worker<VoiceGenerationJobPayload>(
  VOICE_QUEUE_NAME,
  async (job) => processVoiceGenerationJob(job),
  connConfig
);

export const captionWorker = new Worker<CaptionGenerationJobPayload>(
  CAPTION_QUEUE_NAME,
  async (job) => processCaptionGenerationJob(job),
  connConfig
);

export const audioWorker = new Worker<AudioResolutionJobPayload>(
  AUDIO_QUEUE_NAME,
  async (job) => processAudioResolutionJob(job),
  connConfig
);

export const animationWorker = new Worker<AnimationJobPayload>(
  ANIMATION_QUEUE_NAME,
  async (job) => processAnimationIntelligenceJob(job),
  connConfig
);

export const renderWorker = new Worker<RenderJobPayload>(
  RENDER_QUEUE_NAME,
  async (job) => processVideoRenderingJob(job),
  connConfig
);

export const publishWorker = new Worker<SocialPublishJobPayload>(
  PUBLISH_QUEUE_NAME,
  async (job) => processSocialPublishingJob(job),
  connConfig
);

export const bulkCampaignWorker = new Worker<BulkCampaignJobPayload>(
  BULK_CAMPAIGN_QUEUE_NAME,
  async (job) => processBulkCampaignProductionJob(job),
  connConfig
);

export const metaAdsWorker = new Worker<MetaAdsPublishJobPayload>(
  META_ADS_QUEUE_NAME,
  async (job) => processMetaAdsPublishingJob(job),
  connConfig
);

export const analyticsSyncWorker = new Worker<AnalyticsSyncJobPayload>(
  ANALYTICS_SYNC_QUEUE_NAME,
  async (job) => processAnalyticsSyncJob(job),
  connConfig
);

export const optimizationExecutionWorker = new Worker<OptimizationExecutionJobPayload>(
  OPTIMIZATION_EXECUTION_QUEUE_NAME,
  async (job) => processOptimizationExecutionJob(job),
  connConfig
);

export const autonomousCampaignWorker = new Worker<AutonomousJobPayload>(
  AUTONOMOUS_CAMPAIGN_QUEUE_NAME,
  async (job) => processAutonomousCampaignJob(job),
  connConfig
);

const workers = [
  { name: TEST_QUEUE_NAME, worker: testWorker },
  { name: REEL_QUEUE_NAME, worker: reelWorker },
  { name: MEDIA_QUEUE_NAME, worker: mediaWorker },
  { name: VOICE_QUEUE_NAME, worker: voiceWorker },
  { name: CAPTION_QUEUE_NAME, worker: captionWorker },
  { name: AUDIO_QUEUE_NAME, worker: audioWorker },
  { name: ANIMATION_QUEUE_NAME, worker: animationWorker },
  { name: RENDER_QUEUE_NAME, worker: renderWorker },
  { name: PUBLISH_QUEUE_NAME, worker: publishWorker },
  { name: BULK_CAMPAIGN_QUEUE_NAME, worker: bulkCampaignWorker },
  { name: META_ADS_QUEUE_NAME, worker: metaAdsWorker },
  { name: ANALYTICS_SYNC_QUEUE_NAME, worker: analyticsSyncWorker },
  { name: OPTIMIZATION_EXECUTION_QUEUE_NAME, worker: optimizationExecutionWorker },
  { name: AUTONOMOUS_CAMPAIGN_QUEUE_NAME, worker: autonomousCampaignWorker }
];


workers.forEach(({ name, worker }) => {
  worker.on('ready', () => {
    console.log(`[VidSnapAI Worker] Worker is active on "${name}".`);
  });
  worker.on('completed', (job, result) => {
    console.log(`[VidSnapAI Worker] Job ${job.id} on "${name}" completed. Result:`, result);
  });
  worker.on('failed', (job, err) => {
    console.error(`[VidSnapAI Worker] Job ${job?.id} on "${name}" failed:`, err.message);
  });
});

async function handleShutdown(signal: string) {
  console.log(`\n[VidSnapAI Worker] Received ${signal}. Shutting down workers gracefully...`);
  await Promise.all(workers.map(({ worker }) => worker.close()));
  await closeWorkerRedis();
  console.log('[VidSnapAI Worker] Workers stopped cleanly. Exiting process.');
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
