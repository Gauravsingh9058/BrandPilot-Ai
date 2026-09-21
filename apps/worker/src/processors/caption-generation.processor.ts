import type { Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { CaptionService } from '@vidsnapai/captions';
import { ReelProductionPlanRepository, ProductionPackageService } from '@vidsnapai/video';
import type { CaptionGenerationJobPayload } from '@vidsnapai/types';

export async function processCaptionGenerationJob(
  job: Job<CaptionGenerationJobPayload>
): Promise<{ status: string; captionTrackId: string; cuesCount: number; reelPlanId: string }> {
  console.log(`[Worker:CaptionGeneration] Processing job #${job.id} for Reel: ${job.data.reelPlanId}`);
  await job.updateProgress(10);

  const db = getDatabase();
  const reelRepo = new ReelProductionPlanRepository(db);

  const reelPlan = await reelRepo.findByIdAndWorkspace(job.data.reelPlanId, job.data.workspaceId);
  if (!reelPlan) {
    throw new Error(`Reel plan ${job.data.reelPlanId} not found in workspace ${job.data.workspaceId}`);
  }

  const captionService = new CaptionService(db);
  const packageService = new ProductionPackageService(db);

  await job.updateProgress(40);

  const captionTrack = await captionService.generateCaptionTrack(
    reelPlan,
    job.data.workspaceId,
    { style: job.data.style }
  );

  await job.updateProgress(80);

  // Update production package readiness
  await packageService.compilePackage(reelPlan.id, job.data.workspaceId);

  await job.updateProgress(100);
  console.log(`[Worker:CaptionGeneration] Finished job #${job.id}. Generated ${captionTrack.cues.length} cues.`);

  return {
    status: 'completed',
    captionTrackId: captionTrack.id,
    cuesCount: captionTrack.cues.length,
    reelPlanId: reelPlan.id
  };
}
