import type { Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { CampaignAutomationService } from '@vidsnapai/video';
import type { BulkCampaignJobPayload, BulkCampaignJobResult } from '@vidsnapai/types';

export async function processBulkCampaignProductionJob(
  job: Job<BulkCampaignJobPayload>
): Promise<BulkCampaignJobResult> {
  const { id, campaignId, workspaceId, autoApprove } = job.data;
  console.log(`[Worker] Starting bulk campaign production job #${job.id}: Campaign=${campaignId}`);

  await job.updateProgress(10);

  const db = getDatabase();
  const automationService = new CampaignAutomationService(db);

  try {
    await job.updateProgress(30);
    const result = await automationService.produceCampaignReels({
      campaignId,
      workspaceId,
      autoApprove,
      concurrency: 2
    });

    await job.updateProgress(100);
    console.log(`[Worker] Bulk campaign production completed. Total: ${result.total}, Succeeded: ${result.succeeded.length}, Failed: ${result.failed.length}`);

    return {
      jobId: id || String(job.id),
      campaignId,
      totalJobs: result.total,
      completedJobs: result.succeeded.length,
      failedJobs: result.failed.length,
      status: 'completed',
      processedAt: new Date().toISOString()
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown bulk production failure';
    console.error(`[Worker] Bulk campaign production job #${job.id} failed:`, errorMsg);

    return {
      jobId: id || String(job.id),
      campaignId,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      status: 'failed',
      processedAt: new Date().toISOString()
    };
  }
}
