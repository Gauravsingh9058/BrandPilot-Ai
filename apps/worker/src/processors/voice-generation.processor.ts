import type { Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { VoiceService } from '@vidsnapai/voice';
import { ReelProductionPlanRepository, ProductionPackageService } from '@vidsnapai/video';
import type { VoiceGenerationJobPayload } from '@vidsnapai/types';

export async function processVoiceGenerationJob(
  job: Job<VoiceGenerationJobPayload>
): Promise<{ status: string; voiceAssetId: string; reelPlanId: string }> {
  console.log(`[Worker:VoiceGeneration] Processing job #${job.id} for Reel: ${job.data.reelPlanId}`);
  await job.updateProgress(10);

  const db = getDatabase();
  const reelRepo = new ReelProductionPlanRepository(db);

  const reelPlan = await reelRepo.findByIdAndWorkspace(job.data.reelPlanId, job.data.workspaceId);
  if (!reelPlan) {
    throw new Error(`Reel plan ${job.data.reelPlanId} not found in workspace ${job.data.workspaceId}`);
  }

  const voiceService = new VoiceService(db);
  const packageService = new ProductionPackageService(db);

  await job.updateProgress(40);

  const voiceAsset = await voiceService.generateVoiceTrack(
    reelPlan,
    job.data.workspaceId,
    { voiceConfig: job.data.voiceConfig }
  );

  await job.updateProgress(80);

  // Update production package readiness
  await packageService.compilePackage(reelPlan.id, job.data.workspaceId);

  await job.updateProgress(100);
  console.log(`[Worker:VoiceGeneration] Finished job #${job.id}. Generated voice asset: ${voiceAsset.id}`);

  return {
    status: 'completed',
    voiceAssetId: voiceAsset.id,
    reelPlanId: reelPlan.id
  };
}
