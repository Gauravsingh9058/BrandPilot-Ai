import type { Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { VideoRenderService, ReelProductionPlanRepository } from '@vidsnapai/video';
import type { RenderJobPayload, RenderJobResult } from '@vidsnapai/types';

export async function processVideoRenderingJob(
  job: Job<RenderJobPayload>
): Promise<RenderJobResult> {
  console.log(`[Worker:VideoRendering] Processing render job #${job.id} for Reel: ${job.data.reelPlanId}`);
  await job.updateProgress(10);

  const db = getDatabase();
  const renderService = new VideoRenderService(db);
  const reelRepo = new ReelProductionPlanRepository(db);

  try {
    await job.updateProgress(30);

    const renderOutput = await renderService.renderReelVideo(
      job.data.reelPlanId,
      job.data.workspaceId,
      { renderMode: 'PRODUCTION' }
    );

    await job.updateProgress(100);
    console.log(`[Worker:VideoRendering] Completed render job #${job.id}. Output URL: ${renderOutput.outputVideoUrl}`);

    return {
      jobId: String(job.id),
      reelPlanId: job.data.reelPlanId,
      status: 'completed',
      outputVideoUrl: renderOutput.outputVideoUrl,
      durationSeconds: renderOutput.durationSeconds,
      processedAt: new Date().toISOString()
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown rendering failure';
    console.error(`[Worker:VideoRendering] Failed render job #${job.id}:`, errorMsg);

    try {
      await reelRepo.updateStatus(job.data.reelPlanId, 'FAILED');
    } catch {
      // ignore secondary error
    }

    throw err instanceof Error ? err : new Error(errorMsg);
  }
}
