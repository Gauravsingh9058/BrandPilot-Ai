import type { Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { SocialPublishingService } from '@vidsnapai/video';
import type { SocialPublishJobPayload, SocialPublishJobResult } from '@vidsnapai/types';

export async function processSocialPublishingJob(
  job: Job<SocialPublishJobPayload>
): Promise<SocialPublishJobResult> {
  const { id, publicationId, reelPlanId, workspaceId, brandId, platform } = job.data;
  console.log(`[Worker] Starting social publishing job #${job.id}: Platform=${platform}, Reel=${reelPlanId}`);

  await job.updateProgress(10);

  const db = getDatabase();
  const publishingService = new SocialPublishingService(db);

  try {
    await job.updateProgress(40);
    const { publication, result } = await publishingService.publishReel({
      publicationId,
      reelPlanId,
      workspaceId,
      brandId,
      platform
    });

    await job.updateProgress(100);
    console.log(`[Worker] Finished social publishing job #${job.id} -> Success (${result.externalUrl || result.externalPostId})`);

    return {
      jobId: id || String(job.id),
      publicationId: publication.id,
      reelPlanId,
      status: 'completed',
      externalPostId: result.externalPostId,
      externalUrl: result.externalUrl,
      processedAt: new Date().toISOString()
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown social publishing failure';
    console.error(`[Worker] Social publishing job #${job.id} failed:`, errorMsg);

    return {
      jobId: id || String(job.id),
      publicationId,
      reelPlanId,
      status: 'failed',
      error: errorMsg,
      processedAt: new Date().toISOString()
    };
  }
}
