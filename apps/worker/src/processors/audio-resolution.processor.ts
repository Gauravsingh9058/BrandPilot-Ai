import type { Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { AudioService } from '@vidsnapai/audio';
import { ReelProductionPlanRepository, ProductionPackageService } from '@vidsnapai/video';
import type { AudioResolutionJobPayload } from '@vidsnapai/types';

export async function processAudioResolutionJob(
  job: Job<AudioResolutionJobPayload>
): Promise<{ status: string; audioMixPlanId: string; reelPlanId: string }> {
  console.log(`[Worker:AudioResolution] Processing job #${job.id} for Reel: ${job.data.reelPlanId}`);
  await job.updateProgress(10);

  const db = getDatabase();
  const reelRepo = new ReelProductionPlanRepository(db);

  const reelPlan = await reelRepo.findByIdAndWorkspace(job.data.reelPlanId, job.data.workspaceId);
  if (!reelPlan) {
    throw new Error(`Reel plan ${job.data.reelPlanId} not found in workspace ${job.data.workspaceId}`);
  }

  const audioService = new AudioService(db);
  const packageService = new ProductionPackageService(db);

  await job.updateProgress(40);

  const mixPlan = await audioService.resolveAudioPlan(
    reelPlan,
    job.data.workspaceId,
    {
      musicSelection: job.data.musicSelection as any,
      sfxSelections: job.data.sfxSelections
    }
  );

  await job.updateProgress(80);

  // Update production package readiness
  await packageService.compilePackage(reelPlan.id, job.data.workspaceId);

  await job.updateProgress(100);
  console.log(`[Worker:AudioResolution] Finished job #${job.id}. Mix plan ID: ${mixPlan.id}`);

  return {
    status: 'completed',
    audioMixPlanId: mixPlan.id,
    reelPlanId: reelPlan.id
  };
}
