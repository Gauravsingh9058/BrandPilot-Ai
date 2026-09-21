import type { Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { MediaService, PexelsProvider } from '@vidsnapai/media';
import { ReelProductionPlanRepository, ProductionPackageService } from '@vidsnapai/video';
import { getConfig } from '@vidsnapai/config';
import type { MediaResolutionJobPayload } from '@vidsnapai/types';

export async function processMediaResolutionJob(
  job: Job<MediaResolutionJobPayload>
): Promise<{ status: string; resolvedAssetsCount: number; reelPlanId: string }> {
  console.log(`[Worker:MediaResolution] Processing job #${job.id} for Reel: ${job.data.reelPlanId}`);
  await job.updateProgress(10);

  const db = getDatabase();
  const config = getConfig();
  const reelRepo = new ReelProductionPlanRepository(db);

  const reelPlan = await reelRepo.findByIdAndWorkspace(job.data.reelPlanId, job.data.workspaceId);
  if (!reelPlan) {
    throw new Error(`Reel plan ${job.data.reelPlanId} not found in workspace ${job.data.workspaceId}`);
  }

  const pexelsProvider = config.PEXELS_API_KEY
    ? new PexelsProvider({ apiKey: config.PEXELS_API_KEY })
    : undefined;

  const mediaService = new MediaService(db, pexelsProvider);
  const packageService = new ProductionPackageService(db);

  await job.updateProgress(40);

  let resultAssetsCount = 0;
  if (job.data.sceneNumber) {
    const singleAsset = await mediaService.resolveSceneMedia(
      reelPlan,
      job.data.sceneNumber,
      job.data.workspaceId
    );
    resultAssetsCount = singleAsset ? 1 : 0;
  } else {
    const batchResult = await mediaService.resolveReelMedia(
      reelPlan,
      job.data.workspaceId,
      { refreshExisting: job.data.action === 'REGENERATE_MEDIA' }
    );
    resultAssetsCount = batchResult.assets.length;
  }

  await job.updateProgress(80);

  // Update production package readiness
  await packageService.compilePackage(reelPlan.id, job.data.workspaceId);

  await job.updateProgress(100);
  console.log(`[Worker:MediaResolution] Finished job #${job.id}. Resolved ${resultAssetsCount} assets.`);

  return {
    status: 'completed',
    resolvedAssetsCount: resultAssetsCount,
    reelPlanId: reelPlan.id
  };
}
