import type { Job } from 'bullmq';
import { getDatabase } from '@vidsnapai/database';
import { AnimationService } from '@vidsnapai/animation';
import { ReelProductionPlanRepository, ProductionPackageService } from '@vidsnapai/video';
import { DnaRepository } from '@vidsnapai/brand';
import { MarketingStrategyRepository, CampaignRepository } from '@vidsnapai/campaign';
import { GeminiProvider } from '@vidsnapai/ai';
import { getConfig } from '@vidsnapai/config';
import type { AnimationJobPayload, AnimationJobResult } from '@vidsnapai/types';

export async function processAnimationIntelligenceJob(
  job: Job<AnimationJobPayload>
): Promise<AnimationJobResult> {
  console.log(`[Worker:AnimationIntelligence] Processing job #${job.id} action: ${job.data.action} for Reel: ${job.data.reelPlanId}`);
  await job.updateProgress(10);

  const db = getDatabase();
  const config = getConfig();
  const reelRepo = new ReelProductionPlanRepository(db);
  const packageService = new ProductionPackageService(db);
  const dnaRepo = new DnaRepository(db);
  const marketingRepo = new MarketingStrategyRepository(db);
  const campaignRepo = new CampaignRepository(db);

  const reelPlan = await reelRepo.findByIdAndWorkspace(job.data.reelPlanId, job.data.workspaceId);
  if (!reelPlan) {
    throw new Error(`Reel plan ${job.data.reelPlanId} not found in workspace ${job.data.workspaceId}`);
  }

  // Ensure production package is compiled
  let productionPackage = await packageService.getPackageByReelPlanId(reelPlan.id, job.data.workspaceId);
  if (!productionPackage) {
    productionPackage = await packageService.compilePackage(reelPlan.id, job.data.workspaceId);
  }

  const brandDna = await dnaRepo.findLatestByBrandId(job.data.brandId);
  const marketingStrategy = await marketingRepo.findLatestByBrandId(job.data.brandId);
  const campaign = reelPlan.campaignId ? await campaignRepo.findByIdAndBrand(reelPlan.campaignId, reelPlan.brandId) : null;
  const campaignStrategy = campaign?.campaignStrategy || null;

  const aiProvider = config.GEMINI_API_KEY
    ? new GeminiProvider({ apiKey: config.GEMINI_API_KEY, modelName: config.GEMINI_MODEL })
    : undefined;

  const animationService = new AnimationService(aiProvider);
  await job.updateProgress(30);

  if (job.data.action === 'REGENERATE_SCENE_ANIMATION' && job.data.sceneNumber) {
    const updatedPlan = await animationService.regenerateSceneAnimation({
      workspaceId: job.data.workspaceId,
      reelPlanId: reelPlan.id,
      sceneNumber: job.data.sceneNumber,
      productionPackage,
      input: job.data.input as any
    });

    if (!updatedPlan) {
      throw new Error(`Failed to regenerate scene #${job.data.sceneNumber} animation for Reel ${reelPlan.id}`);
    }

    const readiness = await animationService.getReadinessReport(reelPlan.id, job.data.workspaceId, productionPackage);
    await job.updateProgress(100);

    return {
      jobId: String(job.id),
      reelPlanId: reelPlan.id,
      animationPlanId: updatedPlan.id,
      version: updatedPlan.version,
      status: 'completed',
      readinessScore: readiness?.score || 100,
      processedAt: new Date().toISOString()
    };
  }

  // Full plan generation or regeneration
  const { animationPlan, readiness } = await animationService.generateAnimationPlan({
    workspaceId: job.data.workspaceId,
    brandId: job.data.brandId,
    reelPlan,
    productionPackage,
    brandDna,
    marketingStrategy,
    campaignStrategy,
    input: job.data.input as any
  });

  await job.updateProgress(100);
  console.log(`[Worker:AnimationIntelligence] Finished job #${job.id}. Generated version ${animationPlan.version}, readiness score ${readiness.score}`);

  return {
    jobId: String(job.id),
    reelPlanId: reelPlan.id,
    animationPlanId: animationPlan.id,
    version: animationPlan.version,
    status: 'completed',
    readinessScore: readiness.score,
    processedAt: new Date().toISOString()
  };
}
