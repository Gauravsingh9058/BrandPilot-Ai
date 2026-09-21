import type { Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { MetaAdsService } from '@vidsnapai/video';
import type { MetaAdsPublishJobPayload, MetaAdsPublishJobResult } from '@vidsnapai/types';

export async function processMetaAdsPublishingJob(
  job: Job<MetaAdsPublishJobPayload>
): Promise<MetaAdsPublishJobResult> {
  const { id, publicationId, reelPlanId, publishPayload } = job.data;
  console.log(`[Worker] Starting Meta Ads publishing job #${job.id}: Reel=${reelPlanId}`);

  await job.updateProgress(10);

  const db = getDatabase();
  const metaService = new MetaAdsService(db);

  try {
    await job.updateProgress(30);

    const result = await metaService.publishToMeta(publishPayload);

    if (!result.success) {
      throw new Error(result.errorMessage || 'Meta Ads publishing failed');
    }

    await job.updateProgress(100);
    console.log(
      `[Worker] Finished Meta Ads publishing job #${job.id} -> Success (${result.externalAdId || result.adsManagerUrl})`
    );

    return {
      jobId: id || String(job.id),
      publicationId: result.publicationId || publicationId,
      reelPlanId,
      status: 'completed',
      externalAdId: result.externalAdId,
      adsManagerUrl: result.adsManagerUrl,
      processedAt: new Date().toISOString()
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown Meta Ads publishing failure';
    console.error(`[Worker] Meta Ads publishing job #${job.id} failed:`, errorMsg);

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
