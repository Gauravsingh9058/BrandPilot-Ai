import { Queue } from 'bullmq';
import { getRedisClient } from '../lib/redis.js';
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
  BulkCampaignJobPayload
} from '@vidsnapai/types';

export const TEST_QUEUE_NAME = 'test-queue';
export const REEL_QUEUE_NAME = 'reel-orchestration';
export const MEDIA_QUEUE_NAME = 'media-resolution';
export const VOICE_QUEUE_NAME = 'voice-generation';
export const CAPTION_QUEUE_NAME = 'caption-generation';
export const AUDIO_QUEUE_NAME = 'audio-resolution';
export const ANIMATION_QUEUE_NAME = 'animation-intelligence';
export const RENDER_QUEUE_NAME = 'video-rendering';
export const PUBLISH_QUEUE_NAME = 'social-publishing';
export const BULK_CAMPAIGN_QUEUE_NAME = 'bulk-campaign-production';

let testQueue: Queue<TestJobPayload> | null = null;
let reelQueue: Queue<ReelOrchestrationJobPayload> | null = null;
let mediaQueue: Queue<MediaResolutionJobPayload> | null = null;
let voiceQueue: Queue<VoiceGenerationJobPayload> | null = null;
let captionQueue: Queue<CaptionGenerationJobPayload> | null = null;
let audioQueue: Queue<AudioResolutionJobPayload> | null = null;
let animationQueue: Queue<AnimationJobPayload> | null = null;
let renderQueue: Queue<RenderJobPayload> | null = null;
let publishQueue: Queue<SocialPublishJobPayload> | null = null;
let bulkCampaignQueue: Queue<BulkCampaignJobPayload> | null = null;

export function getTestQueue(): Queue<TestJobPayload> {
  if (!testQueue) {
    const connection = getRedisClient();
    testQueue = new Queue<TestJobPayload>(TEST_QUEUE_NAME, {
      connection: connection as unknown as { host?: string; port?: number }
    });
  }
  return testQueue;
}

export function getReelQueue(): Queue<ReelOrchestrationJobPayload> {
  if (!reelQueue) {
    const connection = getRedisClient();
    reelQueue = new Queue<ReelOrchestrationJobPayload>(REEL_QUEUE_NAME, {
      connection: connection as unknown as { host?: string; port?: number }
    });
  }
  return reelQueue;
}

export function getMediaQueue(): Queue<MediaResolutionJobPayload> {
  if (!mediaQueue) {
    const connection = getRedisClient();
    mediaQueue = new Queue<MediaResolutionJobPayload>(MEDIA_QUEUE_NAME, {
      connection: connection as unknown as { host?: string; port?: number }
    });
  }
  return mediaQueue;
}

export function getVoiceQueue(): Queue<VoiceGenerationJobPayload> {
  if (!voiceQueue) {
    const connection = getRedisClient();
    voiceQueue = new Queue<VoiceGenerationJobPayload>(VOICE_QUEUE_NAME, {
      connection: connection as unknown as { host?: string; port?: number }
    });
  }
  return voiceQueue;
}

export function getCaptionQueue(): Queue<CaptionGenerationJobPayload> {
  if (!captionQueue) {
    const connection = getRedisClient();
    captionQueue = new Queue<CaptionGenerationJobPayload>(CAPTION_QUEUE_NAME, {
      connection: connection as unknown as { host?: string; port?: number }
    });
  }
  return captionQueue;
}

export function getAudioQueue(): Queue<AudioResolutionJobPayload> {
  if (!audioQueue) {
    const connection = getRedisClient();
    audioQueue = new Queue<AudioResolutionJobPayload>(AUDIO_QUEUE_NAME, {
      connection: connection as unknown as { host?: string; port?: number }
    });
  }
  return audioQueue;
}

export function getAnimationQueue(): Queue<AnimationJobPayload> {
  if (!animationQueue) {
    const connection = getRedisClient();
    animationQueue = new Queue<AnimationJobPayload>(ANIMATION_QUEUE_NAME, {
      connection: connection as unknown as { host?: string; port?: number }
    });
  }
  return animationQueue;
}

export function getRenderQueue(): Queue<RenderJobPayload> {
  if (!renderQueue) {
    const connection = getRedisClient();
    renderQueue = new Queue<RenderJobPayload>(RENDER_QUEUE_NAME, {
      connection: connection as unknown as { host?: string; port?: number }
    });
  }
  return renderQueue;
}

export function getPublishQueue(): Queue<SocialPublishJobPayload> {
  if (!publishQueue) {
    const connection = getRedisClient();
    publishQueue = new Queue<SocialPublishJobPayload>(PUBLISH_QUEUE_NAME, {
      connection: connection as unknown as { host?: string; port?: number }
    });
  }
  return publishQueue;
}

export function getBulkCampaignQueue(): Queue<BulkCampaignJobPayload> {
  if (!bulkCampaignQueue) {
    const connection = getRedisClient();
    bulkCampaignQueue = new Queue<BulkCampaignJobPayload>(BULK_CAMPAIGN_QUEUE_NAME, {
      connection: connection as unknown as { host?: string; port?: number }
    });
  }
  return bulkCampaignQueue;
}

const DEFAULT_JOB_OPTS = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000
  },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 }
};

export class QueueService {
  async enqueueTestJob(payload: TestJobPayload): Promise<{ jobId: string }> {
    const queue = getTestQueue();
    const job = await queue.add('process-test-job', payload, {
      jobId: payload.id,
      ...DEFAULT_JOB_OPTS
    });
    return { jobId: String(job.id) };
  }

  async enqueueReelJob(payload: ReelOrchestrationJobPayload): Promise<{ jobId: string }> {
    const queue = getReelQueue();
    const job = await queue.add(payload.action, payload, {
      jobId: payload.id,
      ...DEFAULT_JOB_OPTS
    });
    return { jobId: String(job.id) };
  }

  async enqueueMediaJob(payload: MediaResolutionJobPayload): Promise<{ jobId: string }> {
    const queue = getMediaQueue();
    const job = await queue.add(payload.action, payload, {
      jobId: payload.id,
      ...DEFAULT_JOB_OPTS
    });
    return { jobId: String(job.id) };
  }

  async enqueueVoiceJob(payload: VoiceGenerationJobPayload): Promise<{ jobId: string }> {
    const queue = getVoiceQueue();
    const job = await queue.add(payload.action, payload, {
      jobId: payload.id,
      ...DEFAULT_JOB_OPTS
    });
    return { jobId: String(job.id) };
  }

  async enqueueCaptionJob(payload: CaptionGenerationJobPayload): Promise<{ jobId: string }> {
    const queue = getCaptionQueue();
    const job = await queue.add(payload.action, payload, {
      jobId: payload.id,
      ...DEFAULT_JOB_OPTS
    });
    return { jobId: String(job.id) };
  }

  async enqueueAudioJob(payload: AudioResolutionJobPayload): Promise<{ jobId: string }> {
    const queue = getAudioQueue();
    const job = await queue.add(payload.action, payload, {
      jobId: payload.id,
      ...DEFAULT_JOB_OPTS
    });
    return { jobId: String(job.id) };
  }

  async enqueueAnimationJob(payload: AnimationJobPayload): Promise<{ jobId: string }> {
    const queue = getAnimationQueue();
    const job = await queue.add(payload.action, payload, {
      jobId: payload.id,
      ...DEFAULT_JOB_OPTS
    });
    return { jobId: String(job.id) };
  }

  async enqueueRenderJob(payload: RenderJobPayload): Promise<{ jobId: string }> {
    const queue = getRenderQueue();
    const job = await queue.add(payload.action, payload, {
      jobId: payload.id,
      ...DEFAULT_JOB_OPTS
    });
    return { jobId: String(job.id) };
  }

  async enqueueSocialPublishJob(payload: SocialPublishJobPayload, delayMs?: number): Promise<{ jobId: string }> {
    const queue = getPublishQueue();
    const job = await queue.add(payload.action, payload, {
      jobId: payload.id,
      delay: delayMs && delayMs > 0 ? delayMs : undefined,
      ...DEFAULT_JOB_OPTS
    });
    return { jobId: String(job.id) };
  }

  async enqueueBulkCampaignProductionJob(payload: BulkCampaignJobPayload): Promise<{ jobId: string }> {
    const queue = getBulkCampaignQueue();
    const job = await queue.add(payload.action, payload, {
      jobId: payload.id,
      ...DEFAULT_JOB_OPTS
    });
    return { jobId: String(job.id) };
  }

  async enqueueAutonomousJob(payload: import('@vidsnapai/types').AutonomousJobPayload): Promise<{ jobId: string }> {
    const queue = getAutonomousCampaignQueue();
    const job = await queue.add(payload.action, payload, {
      jobId: payload.id,
      ...DEFAULT_JOB_OPTS
    });
    return { jobId: String(job.id) };
  }
}

export const AUTONOMOUS_CAMPAIGN_QUEUE_NAME = 'autonomous-campaign';
let autonomousCampaignQueue: Queue<import('@vidsnapai/types').AutonomousJobPayload> | null = null;

export function getAutonomousCampaignQueue(): Queue<import('@vidsnapai/types').AutonomousJobPayload> {
  if (!autonomousCampaignQueue) {
    const connection = getRedisClient();
    autonomousCampaignQueue = new Queue<import('@vidsnapai/types').AutonomousJobPayload>(AUTONOMOUS_CAMPAIGN_QUEUE_NAME, {
      connection: connection as unknown as { host?: string; port?: number }
    });
  }
  return autonomousCampaignQueue;
}

